/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getReportDateRangeBounds,
  isDateWithinRange,
  calculateFinancialReport,
  calculateSalesReport,
  calculateExpenseReport,
  calculateProductPerformanceReport,
  calculateCustomerAnalyticsReport,
  calculateInvoicePaymentReport,
} from './reports';
import {
  SalesOrder,
  SalesOrderItem,
  Invoice,
  Payment,
  Expense,
  ExpensePayment,
  Product,
  Customer,
} from '../types/database';

test('getReportDateRangeBounds computes proper boundary limits for presets', () => {
  const ref = new Date('2026-06-15T12:00:00Z');
  const today = getReportDateRangeBounds('today', undefined, undefined, ref);
  assert.equal(today.startDate, '2026-06-15');
  assert.equal(today.endDate, '2026-06-15');

  const sevenDays = getReportDateRangeBounds('7d', undefined, undefined, ref);
  assert.equal(sevenDays.startDate, '2026-06-08');
  assert.equal(sevenDays.endDate, '2026-06-15');

  const thirtyDays = getReportDateRangeBounds('30d', undefined, undefined, ref);
  assert.equal(thirtyDays.startDate, '2026-05-16');
  assert.equal(thirtyDays.endDate, '2026-06-15');

  const thisMonth = getReportDateRangeBounds('this_month', undefined, undefined, ref);
  assert.equal(thisMonth.startDate, '2026-06-01');
  assert.equal(thisMonth.endDate, '2026-06-15');

  const custom = getReportDateRangeBounds('custom', '2026-01-01', '2026-03-31', ref);
  assert.equal(custom.startDate, '2026-01-01');
  assert.equal(custom.endDate, '2026-03-31');

  const allTime = getReportDateRangeBounds('all', undefined, undefined, ref);
  assert.equal(allTime.startDate, undefined);
  assert.equal(allTime.endDate, undefined);
});

test('calculateFinancialReport computes gross profit, COGS, net profit, and AR/AP correctly', () => {
  const products: Product[] = [
    {
      id: 'p1',
      organization_id: 'org1',
      sku: 'SKU-1',
      name: 'Item One',
      selling_price: 100,
      cost_price: 40, // 40 unit cost
      stock_quantity: 50,
      low_stock_threshold: 10,
      unit: 'unit',
      status: 'active',
      created_at: '2026-01-01',
    },
  ];

  const orders: SalesOrder[] = [
    {
      id: 'ord_1',
      organization_id: 'org1',
      order_number: 'SO-101',
      customer_id: 'cust_1',
      order_date: '2026-06-10',
      status: 'completed',
      subtotal: 200,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 200, // 2 units sold at 100
      created_at: '2026-06-10',
      updated_at: '2026-06-10',
    },
    {
      id: 'ord_cancelled',
      organization_id: 'org1',
      order_number: 'SO-102',
      customer_id: 'cust_1',
      order_date: '2026-06-11',
      status: 'cancelled', // Should be excluded from realized sales
      subtotal: 500,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 500,
      created_at: '2026-06-11',
      updated_at: '2026-06-11',
    },
  ];

  const orderItems: SalesOrderItem[] = [
    {
      id: 'item_1',
      order_id: 'ord_1',
      product_id: 'p1',
      product_name_snapshot: 'Item One',
      sku_snapshot: 'SKU-1',
      quantity: 2, // 2 * 40 cost = 80 COGS
      unit_price: 100,
      discount_amount: 0,
      tax_amount: 0,
      line_total: 200,
      created_at: '2026-06-10',
    },
    {
      id: 'item_cancelled',
      order_id: 'ord_cancelled',
      product_id: 'p1',
      product_name_snapshot: 'Item One',
      sku_snapshot: 'SKU-1',
      quantity: 5,
      unit_price: 100,
      discount_amount: 0,
      tax_amount: 0,
      line_total: 500,
      created_at: '2026-06-11',
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv_1',
      organization_id: 'org1',
      invoice_number: 'INV-101',
      customer_id: 'cust_1',
      sales_order_id: 'ord_1',
      issue_date: '2026-06-10',
      due_date: '2026-07-10',
      status: 'issued',
      subtotal: 200,
      tax_amount: 0,
      total_amount: 200,
      amount_paid: 50, // 150 outstanding AR
      created_at: '2026-06-10',
      updated_at: '2026-06-10',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay_1',
      organization_id: 'org1',
      invoice_id: 'inv_1',
      payment_number: 'PAY-101',
      amount: 50,
      payment_date: '2026-06-11',
      payment_method: 'card',
      status: 'recorded',
      created_at: '2026-06-11',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_1',
      organization_id: 'org1',
      category: 'software',
      vendor: 'Cloud Host Inc',
      description: 'Hosting subscription',
      amount: 50,
      amount_paid: 20, // 30 outstanding AP
      expense_date: '2026-06-12',
      payment_method: 'card',
      payment_status: 'partially_paid',
      created_at: '2026-06-12',
    },
  ];

  const report = calculateFinancialReport({
    orders,
    orderItems,
    invoices,
    payments,
    expenses,
    products,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  });

  assert.equal(report.realizedOrderRevenue, 200);
  assert.equal(report.costOfGoodsSold, 80);
  assert.equal(report.grossProfit, 120); // 200 - 80
  assert.equal(report.grossProfitMargin, 60); // 120 / 200 * 100
  assert.equal(report.totalOperatingExpenses, 50);
  assert.equal(report.cashPaidExpenses, 20);
  assert.equal(report.estimatedNetProfit, 70); // 120 - 50
  assert.equal(report.netProfitMargin, 35); // 70 / 200 * 100
  assert.equal(report.accountsReceivableOutstanding, 150);
  assert.equal(report.accountsPayableOutstanding, 30);
  assert.equal(report.netWorkingCapitalBalance, 120); // 150 - 30
});

test('calculateSalesReport ranks products and customers accurately', () => {
  const customers: Customer[] = [
    {
      id: 'c1',
      organization_id: 'org1',
      name: 'Alice Corp',
      status: 'active',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'c2',
      organization_id: 'org1',
      name: 'Bob LLC',
      status: 'active',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const orders: SalesOrder[] = [
    {
      id: 'o1',
      organization_id: 'org1',
      order_number: 'SO-1',
      customer_id: 'c1',
      order_date: '2026-06-01',
      status: 'completed',
      subtotal: 300,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 300,
      created_at: '2026-06-01',
      updated_at: '2026-06-01',
    },
    {
      id: 'o2',
      organization_id: 'org1',
      order_number: 'SO-2',
      customer_id: 'c2',
      order_date: '2026-06-02',
      status: 'completed',
      subtotal: 100,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 100,
      created_at: '2026-06-02',
      updated_at: '2026-06-02',
    },
  ];

  const orderItems: SalesOrderItem[] = [
    {
      id: 'i1',
      order_id: 'o1',
      product_id: 'p1',
      product_name_snapshot: 'Alpha Widget',
      sku_snapshot: 'WID-A',
      quantity: 3,
      unit_price: 100,
      discount_amount: 0,
      tax_amount: 0,
      line_total: 300,
    },
    {
      id: 'i2',
      order_id: 'o2',
      product_id: 'p2',
      product_name_snapshot: 'Beta Gadget',
      sku_snapshot: 'GAD-B',
      quantity: 1,
      unit_price: 100,
      discount_amount: 0,
      tax_amount: 0,
      line_total: 100,
    },
  ];

  const report = calculateSalesReport({
    orders,
    orderItems,
    customers,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  });

  assert.equal(report.totalSales, 400);
  assert.equal(report.completedOrdersCount, 2);
  assert.equal(report.averageOrderValue, 200);
  assert.equal(report.topProducts[0].name, 'Alpha Widget');
  assert.equal(report.topProducts[0].revenue, 300);
  assert.equal(report.topCustomers[0].name, 'Alice Corp');
  assert.equal(report.topCustomers[0].totalSpent, 300);
});

test('calculateCustomerAnalyticsReport determines repeat customer rates strictly', () => {
  const customers: Customer[] = [
    { id: 'c1', organization_id: 'org1', name: 'Repeat Customer', status: 'active', created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 'c2', organization_id: 'org1', name: 'One-Time Customer', status: 'active', created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 'c3', organization_id: 'org1', name: 'No Purchases', status: 'active', created_at: '2026-01-01', updated_at: '2026-01-01' },
  ];

  const orders: SalesOrder[] = [
    { id: 'o1', organization_id: 'org1', order_number: 'SO-1', customer_id: 'c1', order_date: '2026-06-01', status: 'completed', subtotal: 100, discount_amount: 0, tax_amount: 0, total_amount: 100, created_at: '2026-06-01', updated_at: '2026-06-01' },
    { id: 'o2', organization_id: 'org1', order_number: 'SO-2', customer_id: 'c1', order_date: '2026-06-05', status: 'completed', subtotal: 150, discount_amount: 0, tax_amount: 0, total_amount: 150, created_at: '2026-06-05', updated_at: '2026-06-05' },
    { id: 'o3', organization_id: 'org1', order_number: 'SO-3', customer_id: 'c2', order_date: '2026-06-10', status: 'completed', subtotal: 80, discount_amount: 0, tax_amount: 0, total_amount: 80, created_at: '2026-06-10', updated_at: '2026-06-10' },
  ];

  const cohort = calculateCustomerAnalyticsReport({
    customers,
    orders,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  });

  assert.equal(cohort.totalCustomers, 3);
  assert.equal(cohort.activeBuyingCustomers, 2); // c1 and c2
  assert.equal(cohort.repeatCustomersCount, 1); // c1 (2 orders)
  assert.equal(cohort.repeatCustomerRate, 50); // 1 out of 2 = 50%
  assert.equal(cohort.customerRankings[0].customer.name, 'Repeat Customer');
  assert.equal(cohort.customerRankings[0].totalSpent, 250);
});

test('calculateProductPerformanceReport calculates correct inventory valuation and stockout alerts', () => {
  const products: Product[] = [
    { id: 'p1', organization_id: 'org1', sku: 'S1', name: 'In Stock Item', selling_price: 100, cost_price: 50, stock_quantity: 20, low_stock_threshold: 5, unit: 'unit', status: 'active', created_at: '2026-01-01' },
    { id: 'p2', organization_id: 'org1', sku: 'S2', name: 'Low Stock Item', selling_price: 200, cost_price: 100, stock_quantity: 3, low_stock_threshold: 5, unit: 'unit', status: 'active', created_at: '2026-01-01' },
    { id: 'p3', organization_id: 'org1', sku: 'S3', name: 'Out of Stock Item', selling_price: 150, cost_price: 75, stock_quantity: 0, low_stock_threshold: 5, unit: 'unit', status: 'active', created_at: '2026-01-01' },
  ];

  const report = calculateProductPerformanceReport({
    products,
    orders: [],
    orderItems: [],
  });

  assert.equal(report.inStockCount, 1);
  assert.equal(report.lowStockCount, 1);
  assert.equal(report.outOfStockCount, 1);
  // Total units: 20 + 3 + 0 = 23
  assert.equal(report.totalInventoryUnits, 23);
  // Cost: (20 * 50) + (3 * 100) = 1000 + 300 = 1300
  assert.equal(report.totalCostValuation, 1300);
  // Retail: (20 * 100) + (3 * 200) = 2000 + 600 = 2600
  assert.equal(report.totalRetailValuation, 2600);
  assert.equal(report.lowStockAlertList.length, 2);
});
