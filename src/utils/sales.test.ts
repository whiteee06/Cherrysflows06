/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineItem,
  calculateOrderTotals,
  canTransitionOrderStatus,
  calculateInvoicePaymentState,
  calculateSalesDashboardMetrics,
  filterAndSortOrders,
} from './sales';
import { SalesOrder, Invoice, Payment } from '../types/database';

test('calculateLineItem accurately computes subtotal, discounts, and tax', () => {
  // 3 units @ $100 = $300, discount $50 = $250, 10% tax = $25, total = $275
  const item = calculateLineItem({
    quantity: 3,
    unitPrice: 100,
    discountAmount: 50,
    taxRatePercent: 10,
  });

  assert.equal(item.subtotal, 300);
  assert.equal(item.discountAmount, 50);
  assert.equal(item.taxAmount, 25);
  assert.equal(item.lineTotal, 275);
});

test('calculateLineItem caps discount at subtotal to prevent negative line totals', () => {
  const item = calculateLineItem({
    quantity: 1,
    unitPrice: 50,
    discountAmount: 120, // greater than subtotal
    taxRatePercent: 8,
  });

  assert.equal(item.subtotal, 50);
  assert.equal(item.discountAmount, 50);
  assert.equal(item.taxAmount, 0);
  assert.equal(item.lineTotal, 0);
});

test('calculateOrderTotals computes correct aggregate order financials', () => {
  const items = [
    { quantity: 2, unitPrice: 500, discountAmount: 100, taxAmount: 72 }, // $900 + $72
    { quantity: 5, unitPrice: 40, discountAmount: 0, taxAmount: 16 },    // $200 + $16
  ];

  const totals = calculateOrderTotals(items);
  assert.equal(totals.subtotal, 1200); // (2*500) + (5*40)
  assert.equal(totals.discountAmount, 100);
  assert.equal(totals.taxAmount, 88);
  assert.equal(totals.totalAmount, 1188); // 1200 - 100 + 88
});

test('canTransitionOrderStatus enforces valid lifecycle states and stock movement flags', () => {
  // Draft to Confirmed -> Deducts stock
  const toConfirmed = canTransitionOrderStatus('draft', 'confirmed');
  assert.equal(toConfirmed.allowed, true);
  assert.equal(toConfirmed.requiresStockDeduction, true);

  // Confirmed to Completed -> Allowed without duplicate stock deduction
  const toCompleted = canTransitionOrderStatus('confirmed', 'completed');
  assert.equal(toCompleted.allowed, true);
  assert.equal(toCompleted.requiresStockDeduction, false);

  // Confirmed to Cancelled -> Restores stock
  const toCancelled = canTransitionOrderStatus('confirmed', 'cancelled');
  assert.equal(toCancelled.allowed, true);
  assert.equal(toCancelled.requiresStockRestoration, true);

  // Completed to Cancelled -> Restores stock
  const completedToCancelled = canTransitionOrderStatus('completed', 'cancelled');
  assert.equal(completedToCancelled.allowed, true);
  assert.equal(completedToCancelled.requiresStockRestoration, true);

  // Cancelled cannot be reopened
  const reopen = canTransitionOrderStatus('cancelled', 'confirmed');
  assert.equal(reopen.allowed, false);

  // Same status transition rejected
  const same = canTransitionOrderStatus('confirmed', 'confirmed');
  assert.equal(same.allowed, false);
});

test('calculateInvoicePaymentState computes paid, partial, and unpaid balances strictly', () => {
  const invoice: Invoice = {
    id: 'inv_101',
    organization_id: 'org_test',
    invoice_number: 'INV-2026-001',
    customer_id: 'cust_1',
    issue_date: '2026-06-01',
    due_date: '2026-06-30',
    status: 'issued',
    subtotal: 1000,
    tax_amount: 80,
    total_amount: 1080,
    amount_paid: 0,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  };

  // No payments -> unpaid
  const stateUnpaid = calculateInvoicePaymentState(invoice, []);
  assert.equal(stateUnpaid.paymentStatus, 'unpaid');
  assert.equal(stateUnpaid.outstandingBalance, 1080);
  assert.equal(stateUnpaid.amountPaid, 0);

  // Partial payment of $400
  const payments: Payment[] = [
    {
      id: 'pay_1',
      organization_id: 'org_test',
      invoice_id: 'inv_101',
      payment_number: 'PAY-1001',
      amount: 400,
      payment_date: '2026-06-10',
      payment_method: 'card',
      status: 'recorded',
      created_at: '2026-06-10',
    },
    {
      id: 'pay_2',
      organization_id: 'org_test',
      invoice_id: 'inv_101',
      payment_number: 'PAY-1002',
      amount: 200,
      payment_date: '2026-06-12',
      payment_method: 'cash',
      status: 'reversed', // reversed should NOT count towards paid
      created_at: '2026-06-12',
    },
  ];

  const statePartial = calculateInvoicePaymentState(invoice, payments);
  assert.equal(statePartial.paymentStatus, 'partially_paid');
  assert.equal(statePartial.amountPaid, 400);
  assert.equal(statePartial.outstandingBalance, 680); // 1080 - 400
  assert.equal(statePartial.validPaymentsCount, 1);

  // Full settlement
  const fullPayments: Payment[] = [
    ...payments,
    {
      id: 'pay_3',
      organization_id: 'org_test',
      invoice_id: 'inv_101',
      payment_number: 'PAY-1003',
      amount: 680,
      payment_date: '2026-06-15',
      payment_method: 'bank_transfer',
      status: 'recorded',
      created_at: '2026-06-15',
    },
  ];

  const statePaid = calculateInvoicePaymentState(invoice, fullPayments);
  assert.equal(statePaid.paymentStatus, 'paid');
  assert.equal(statePaid.amountPaid, 1080);
  assert.equal(statePaid.outstandingBalance, 0);
});

test('calculateSalesDashboardMetrics excludes draft/cancelled orders from realized sales', () => {
  const refDate = new Date('2026-06-15T12:00:00Z');
  const orders: SalesOrder[] = [
    {
      id: 'ord_1',
      organization_id: 'org_test',
      order_number: 'SO-101',
      customer_id: 'cust_1',
      order_date: '2026-06-10',
      status: 'confirmed',
      subtotal: 500,
      discount_amount: 0,
      tax_amount: 40,
      total_amount: 540,
      created_at: '2026-06-10',
      updated_at: '2026-06-10',
    },
    {
      id: 'ord_2',
      organization_id: 'org_test',
      order_number: 'SO-102',
      customer_id: 'cust_2',
      order_date: '2026-06-12',
      status: 'completed',
      subtotal: 300,
      discount_amount: 0,
      tax_amount: 24,
      total_amount: 324,
      created_at: '2026-06-12',
      updated_at: '2026-06-12',
    },
    {
      id: 'ord_3',
      organization_id: 'org_test',
      order_number: 'SO-103',
      customer_id: 'cust_3',
      order_date: '2026-06-14',
      status: 'draft', // Not realized sales
      subtotal: 1000,
      discount_amount: 0,
      tax_amount: 80,
      total_amount: 1080,
      created_at: '2026-06-14',
      updated_at: '2026-06-14',
    },
    {
      id: 'ord_4',
      organization_id: 'org_test',
      order_number: 'SO-104',
      customer_id: 'cust_4',
      order_date: '2026-06-14',
      status: 'cancelled', // Cancelled
      subtotal: 800,
      discount_amount: 0,
      tax_amount: 64,
      total_amount: 864,
      created_at: '2026-06-14',
      updated_at: '2026-06-14',
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv_1',
      organization_id: 'org_test',
      invoice_number: 'INV-101',
      customer_id: 'cust_1',
      issue_date: '2026-06-10',
      due_date: '2026-06-30',
      status: 'issued',
      subtotal: 500,
      tax_amount: 40,
      total_amount: 540,
      amount_paid: 200, // 340 outstanding
      created_at: '2026-06-10',
      updated_at: '2026-06-10',
    },
  ];

  const metrics = calculateSalesDashboardMetrics(orders, invoices, '30d', refDate);
  // Realized sales: ord_1 (540) + ord_2 (324) = 864 (draft and cancelled excluded)
  assert.equal(metrics.totalSales, 864);
  assert.equal(metrics.ordersCount, 3); // 1 confirmed + 1 completed + 1 draft (cancelled excluded)
  assert.equal(metrics.completedOrdersCount, 1);
  assert.equal(metrics.cancelledOrdersCount, 1);
  assert.equal(metrics.totalInvoiced, 540);
  assert.equal(metrics.paidAmount, 200);
  assert.equal(metrics.outstandingInvoiceBalance, 340);
  assert.equal(metrics.openInvoicesCount, 1);
});

test('filterAndSortOrders filters by search query and status properly', () => {
  const orders: SalesOrder[] = [
    {
      id: 'ord_1',
      organization_id: 'org_test',
      order_number: 'SO-1001',
      customer_id: 'cust_1',
      order_date: '2026-06-01',
      status: 'confirmed',
      subtotal: 100,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 100,
      created_at: '2026-06-01',
      updated_at: '2026-06-01',
    },
    {
      id: 'ord_2',
      organization_id: 'org_test',
      order_number: 'SO-1002',
      customer_id: 'cust_2',
      order_date: '2026-06-02',
      status: 'completed',
      subtotal: 200,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 200,
      created_at: '2026-06-02',
      updated_at: '2026-06-02',
    },
  ];

  const map = new Map<string, string>([
    ['cust_1', 'Acme Corporation'],
    ['cust_2', 'Beta Logistics'],
  ]);

  const searchResults = filterAndSortOrders(orders, 'Acme', 'all', map);
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].order_number, 'SO-1001');

  const statusResults = filterAndSortOrders(orders, '', 'completed', map);
  assert.equal(statusResults.length, 1);
  assert.equal(statusResults[0].order_number, 'SO-1002');
});
