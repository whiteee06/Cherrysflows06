/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDateRangeBounds,
  isWithinDateRange,
  calculateBusinessOverviewMetrics,
  buildTimeSeriesAnalytics,
  buildRecentTransactions,
  calculateTopProducts,
} from './analytics';
import { SalesOrder, Invoice, Expense, Customer, Product } from '../types/database';

test('getDateRangeBounds calculates proper window limits', () => {
  const ref = new Date('2026-06-15T12:00:00Z');
  const b7 = getDateRangeBounds('7d', ref);
  const diffDays7 = Math.round((b7.end.getTime() - b7.start.getTime()) / (1000 * 60 * 60 * 24));
  assert.ok(diffDays7 >= 6 && diffDays7 <= 7);

  const bYear = getDateRangeBounds('this_year', ref);
  assert.equal(bYear.start.getMonth(), 0);
  assert.equal(bYear.start.getDate(), 1);
});

test('calculateBusinessOverviewMetrics computes sales, expenses, and net profit strictly', () => {
  const refDate = new Date('2026-06-15T12:00:00Z');

  const orders: SalesOrder[] = [
    {
      id: 'ord-1',
      organization_id: 'org-1',
      order_number: 'SO-001',
      customer_id: 'cust-1',
      order_date: '2026-06-10',
      status: 'confirmed',
      subtotal: 1000,
      tax_amount: 100,
      discount_amount: 0,
      total_amount: 1100,
      created_at: '2026-06-10T10:00:00Z',
      updated_at: '2026-06-10T10:00:00Z',
    },
    {
      id: 'ord-2',
      organization_id: 'org-1',
      order_number: 'SO-002',
      customer_id: 'cust-1',
      order_date: '2026-06-12',
      status: 'fulfilled',
      subtotal: 500,
      tax_amount: 50,
      discount_amount: 0,
      total_amount: 550,
      created_at: '2026-06-12T10:00:00Z',
      updated_at: '2026-06-12T10:00:00Z',
    },
    {
      id: 'ord-3',
      organization_id: 'org-1',
      order_number: 'SO-003',
      customer_id: 'cust-2',
      order_date: '2026-06-14',
      status: 'draft', // Not counted in completed revenue
      subtotal: 300,
      tax_amount: 30,
      discount_amount: 0,
      total_amount: 330,
      created_at: '2026-06-14T10:00:00Z',
      updated_at: '2026-06-14T10:00:00Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      organization_id: 'org-1',
      category: 'software',
      vendor: 'AWS',
      description: 'Cloud hosting',
      amount: 450,
      currency: 'USD',
      expense_date: '2026-06-11',
      payment_method: 'card',
      recorded_by: 'user-1',
      created_at: '2026-06-11T10:00:00Z',
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv-1',
      organization_id: 'org-1',
      invoice_number: 'INV-001',
      customer_id: 'cust-1',
      issue_date: '2026-06-08',
      due_date: '2026-06-22',
      status: 'issued', // Outstanding
      subtotal: 1000,
      tax_amount: 100,
      total_amount: 1100,
      amount_paid: 200,
      created_at: '2026-06-08T10:00:00Z',
      updated_at: '2026-06-08T10:00:00Z',
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cust-1',
      organization_id: 'org-1',
      name: 'Acme Corp',
      email: 'acme@example.com',
      status: 'active',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'cust-2',
      organization_id: 'org-1',
      name: 'Beta LLC',
      email: 'beta@example.com',
      status: 'active',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const metrics = calculateBusinessOverviewMetrics(orders, invoices, expenses, customers, '7d', refDate);

  // Total sales = ord-1 (1100) + ord-2 (550) = 1650 (draft ord-3 is excluded)
  assert.equal(metrics.totalSales, 1650);
  assert.equal(metrics.totalExpenses, 450);
  // Net profit = 1650 - 450 = 1200
  assert.equal(metrics.netProfit, 1200);
  // Total orders placed in window = 3
  assert.equal(metrics.totalOrders, 3);
  assert.equal(metrics.totalCustomers, 2);
  // Outstanding invoice = 1100 - 200 = 900
  assert.equal(metrics.outstandingInvoicesAmount, 900);
  assert.equal(metrics.outstandingInvoicesCount, 1);
  assert.equal(metrics.hasData, true);
});

test('calculateBusinessOverviewMetrics handles zero and empty records cleanly', () => {
  const metrics = calculateBusinessOverviewMetrics([], [], [], [], '30d');
  assert.equal(metrics.totalSales, 0);
  assert.equal(metrics.totalExpenses, 0);
  assert.equal(metrics.netProfit, 0);
  assert.equal(metrics.totalOrders, 0);
  assert.equal(metrics.totalCustomers, 0);
  assert.equal(metrics.outstandingInvoicesAmount, 0);
  assert.equal(metrics.hasData, false);
});

test('buildTimeSeriesAnalytics produces continuous points with zero filling', () => {
  const refDate = new Date('2026-06-07T12:00:00Z');
  const points = buildTimeSeriesAnalytics([], [], '7d', refDate);
  assert.equal(points.length, 7);
  assert.equal(points[0].sales, 0);
  assert.equal(points[0].expenses, 0);
  assert.equal(points[0].netProfit, 0);
});

test('buildRecentTransactions combines orders and invoices with correct sorting and badges', () => {
  const orders: SalesOrder[] = [
    {
      id: 'so-1',
      organization_id: 'org-1',
      order_number: 'SO-101',
      customer_id: 'cust-1',
      order_date: '2026-06-01',
      status: 'confirmed',
      subtotal: 100,
      tax_amount: 10,
      discount_amount: 0,
      total_amount: 110,
      created_at: '2026-06-01T10:00:00Z',
      updated_at: '2026-06-01T10:00:00Z',
    },
  ];
  const invoices: Invoice[] = [
    {
      id: 'inv-1',
      organization_id: 'org-1',
      invoice_number: 'INV-201',
      customer_id: 'cust-1',
      issue_date: '2026-06-05',
      due_date: '2026-06-19',
      status: 'paid',
      subtotal: 500,
      tax_amount: 50,
      total_amount: 550,
      amount_paid: 550,
      created_at: '2026-06-05T10:00:00Z',
      updated_at: '2026-06-05T10:00:00Z',
    },
  ];

  const transactions = buildRecentTransactions(orders, invoices, []);
  assert.equal(transactions.length, 2);
  // Newer date (INV-201 on June 5) should appear first
  assert.equal(transactions[0].reference, 'INV-201');
  assert.equal(transactions[0].amount, 550);
  assert.equal(transactions[1].reference, 'SO-101');
  assert.equal(transactions[1].amount, 110);
});

test('calculateTopProducts ranks products by revenue and units sold from confirmed orders', () => {
  const ref = new Date('2026-06-15T12:00:00Z');
  const products: Product[] = [
    {
      id: 'p-1',
      organization_id: 'org-1',
      sku: 'SKU-001',
      name: 'Cloud Hosting Retainer',
      unit_price: 1000,
      selling_price: 1000,
      cost_price: 300,
      stock_quantity: 100,
      low_stock_threshold: 10,
      unit: 'month',
      unit_of_measure: 'month',
      status: 'active',
      is_active: true,
      track_inventory: false,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'p-2',
      organization_id: 'org-1',
      sku: 'SKU-002',
      name: 'Barcode Scanner Terminal',
      unit_price: 250,
      selling_price: 250,
      cost_price: 100,
      stock_quantity: 25,
      low_stock_threshold: 5,
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'active',
      is_active: true,
      track_inventory: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const orders: SalesOrder[] = [
    {
      id: 'o-1',
      organization_id: 'org-1',
      order_number: 'SO-1',
      customer_id: 'c-1',
      order_date: '2026-06-10',
      status: 'fulfilled',
      subtotal: 1000,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 1000,
      notes: 'Cloud Hosting Retainer for June',
      created_at: '2026-06-10T10:00:00Z',
      updated_at: '2026-06-10T10:00:00Z',
    },
    {
      id: 'o-2',
      organization_id: 'org-1',
      order_number: 'SO-2',
      customer_id: 'c-2',
      order_date: '2026-06-12',
      status: 'confirmed',
      subtotal: 500,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 500,
      notes: '2x Barcode Scanner Terminal',
      created_at: '2026-06-12T10:00:00Z',
      updated_at: '2026-06-12T10:00:00Z',
    },
  ];

  const top = calculateTopProducts(orders, products, '7d', ref);
  assert.equal(top.length, 2);
  assert.equal(top[0].name, 'Cloud Hosting Retainer');
  assert.equal(top[0].revenue, 1000);
  assert.equal(top[0].rank, 1);
  assert.equal(top[1].name, 'Barcode Scanner Terminal');
  assert.equal(top[1].unitsSold, 2);
  assert.equal(top[1].revenue, 500);
  assert.equal(top[1].rank, 2);
});

test('calculateTopProducts returns empty array when no products or no sales exist', () => {
  assert.deepEqual(calculateTopProducts([], [], '30d'), []);
  assert.deepEqual(calculateTopProducts([], [{ id: 'p1' } as any], '30d'), []);
});

