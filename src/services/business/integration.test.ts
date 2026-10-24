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
} from '../../utils/sales';
import {
  calculateProductStats,
  getStockStatus,
  validateProductForm,
} from '../../utils/product';
import {
  calculateExpenseMetrics,
  calculateExpensePaymentState,
  validateExpenseForm,
} from '../../utils/expenses';
import {
  calculateFinancialReport,
  calculateSalesReport,
} from '../../utils/reports';
import {
  validateBusinessInfo,
  validateProfileSettings,
  validatePasswordChange,
  formatCurrencyWithSettings,
  formatDateWithSettings,
  getDefaultWorkspaceSettings,
} from '../../utils/settings';
import {
  formatCurrency,
  formatDate,
  formatPhone,
} from '../../utils/formatters';
import { Customer, Product, SalesOrder, Invoice, Payment, Expense } from '../../types/database';
import { siteConfig } from '../../config/site';

test('Integration E2E: Product catalog and stock integrity rules', () => {
  const product: Product = {
    id: 'prod_test_01',
    organization_id: 'org_test',
    sku: 'SKU-TEST-001',
    name: 'Precision Milling Drill Bit',
    selling_price: 150.0,
    cost_price: 90.0,
    stock_quantity: 12,
    low_stock_threshold: 15,
    unit: 'pcs',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  // 1. Stock Status classification
  assert.equal(getStockStatus(product), 'low_stock', 'Stock 12 with threshold 15 must be classified as low_stock');
  assert.equal(getStockStatus({ ...product, stock_quantity: 0 }), 'out_of_stock');
  assert.equal(getStockStatus({ ...product, stock_quantity: 25 }), 'in_stock');

  // 2. Product Form Validation
  const validForm = validateProductForm({
    name: product.name,
    sku: product.sku,
    description: 'High precision industrial milling tool',
    category: 'Tooling',
    sellingPrice: '150',
    costPrice: '90',
    stockQuantity: '12',
    lowStockThreshold: '15',
    unit: 'pcs',
    status: 'active',
  });
  assert.equal(validForm.isValid, true);

  // 3. Negative price or stock rejection
  const invalidForm = validateProductForm({
    name: '',
    sku: '',
    description: '',
    category: '',
    sellingPrice: '-10',
    costPrice: '-5',
    stockQuantity: '-1',
    lowStockThreshold: '-1',
    unit: 'pcs',
    status: 'active',
  });
  assert.equal(invalidForm.isValid, false);
  assert.ok(invalidForm.errors.name);
  assert.ok(invalidForm.errors.sku);
  assert.ok(invalidForm.errors.sellingPrice);
  assert.ok(invalidForm.errors.costPrice);
});

test('Integration E2E: Order creation, line item calculations, and lifecycle invariants', () => {
  const lineItem = calculateLineItem({
    quantity: 4,
    unitPrice: 200,
    discountAmount: 50,
    taxRatePercent: 10,
  });
  // Subtotal = 800, discount = 50, net taxable = 750, tax = 75, lineTotal = 825
  assert.equal(lineItem.subtotal, 800);
  assert.equal(lineItem.discountAmount, 50);
  assert.equal(lineItem.taxAmount, 75);
  assert.equal(lineItem.lineTotal, 825);

  // Stock transition check
  const draftToConfirmed = canTransitionOrderStatus('draft', 'confirmed');
  assert.equal(draftToConfirmed.allowed, true);
  assert.equal(draftToConfirmed.requiresStockDeduction, true);

  // Confirmed to completed should NOT deduct stock again
  const confirmedToCompleted = canTransitionOrderStatus('confirmed', 'completed');
  assert.equal(confirmedToCompleted.allowed, true);
  assert.equal(confirmedToCompleted.requiresStockDeduction, false);

  // Confirmed to cancelled requires stock restoration
  const confirmedToCancelled = canTransitionOrderStatus('confirmed', 'cancelled');
  assert.equal(confirmedToCancelled.allowed, true);
  assert.equal(confirmedToCancelled.requiresStockRestoration, true);

  // Cancelled order cannot be cancelled again
  const cancelledToCancelled = canTransitionOrderStatus('cancelled', 'cancelled');
  assert.equal(cancelledToCancelled.allowed, false);
});

test('Integration E2E: Invoicing and strict payment balance enforcement', () => {
  const invoice: Invoice = {
    id: 'inv_test_100',
    organization_id: 'org_test',
    invoice_number: 'INV-2026-001',
    customer_id: 'cust_001',
    issue_date: '2026-10-01',
    due_date: '2026-10-31',
    status: 'issued',
    subtotal: 1000,
    tax_amount: 100,
    total_amount: 1100,
    amount_paid: 0,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  const initialPayments: Payment[] = [];
  const state1 = calculateInvoicePaymentState(invoice, initialPayments);
  assert.equal(state1.amountPaid, 0);
  assert.equal(state1.outstandingBalance, 1100);
  assert.equal(state1.isPaid, false);
  assert.equal(state1.paymentStatus, 'unpaid');

  // 1. Partial Payment of $400
  const payment1: Payment = {
    id: 'pay_001',
    organization_id: 'org_test',
    invoice_id: invoice.id,
    payment_number: 'PAY-1001',
    amount: 400,
    payment_date: '2026-10-10',
    payment_method: 'bank_transfer',
    status: 'recorded',
    created_at: '2026-10-10T00:00:00Z',
  };
  const state2 = calculateInvoicePaymentState(invoice, [payment1]);
  assert.equal(state2.amountPaid, 400);
  assert.equal(state2.outstandingBalance, 700);
  assert.equal(state2.paymentStatus, 'partially_paid');
  assert.equal(state2.isPaid, false);

  // 2. Final Payment of remaining $700
  const payment2: Payment = {
    id: 'pay_002',
    organization_id: 'org_test',
    invoice_id: invoice.id,
    payment_number: 'PAY-1002',
    amount: 700,
    payment_date: '2026-10-15',
    payment_method: 'card',
    status: 'recorded',
    created_at: '2026-10-15T00:00:00Z',
  };
  const state3 = calculateInvoicePaymentState(invoice, [payment1, payment2]);
  assert.equal(state3.amountPaid, 1100);
  assert.equal(state3.outstandingBalance, 0);
  assert.equal(state3.isPaid, true);
  assert.equal(state3.paymentStatus, 'paid');
});

test('Integration E2E: Financial reporting mathematics and non-fabrication', () => {
  const orders: SalesOrder[] = [
    {
      id: 'ord_1',
      organization_id: 'org_test',
      order_number: 'ORD-001',
      customer_id: 'cust_1',
      order_date: '2026-10-05',
      status: 'completed',
      subtotal: 5000,
      discount_amount: 200,
      tax_amount: 400,
      total_amount: 5200,
      created_at: '2026-10-05T00:00:00Z',
      updated_at: '2026-10-05T00:00:00Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_1',
      organization_id: 'org_test',
      vendor: 'Cloud Hosting Services',
      description: 'Production infrastructure',
      category: 'Software Subscriptions',
      amount: 600,
      amount_paid: 600,
      expense_date: '2026-10-06',
      payment_method: 'card',
      payment_status: 'paid',
      created_at: '2026-10-06T00:00:00Z',
    },
  ];

  const report = calculateFinancialReport({
    orders,
    orderItems: [],
    invoices: [],
    payments: [],
    expenses,
    products: [],
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });

  // Realized revenue must equal total_amount of completed orders
  assert.equal(report.realizedOrderRevenue, 5200);
  // Total operating expenses
  assert.equal(report.totalOperatingExpenses, 600);
  // Net profit must equal gross profit minus expenses
  assert.equal(report.estimatedNetProfit, report.grossProfit - 600);
});

test('Integration E2E: Regional preferences and formatter formatting', () => {
  const formattedInr = formatCurrencyWithSettings(150000, 'INR', 'standard');
  assert.ok(formattedInr.includes('₹') || formattedInr.includes('INR'), 'Must format with Rupee symbol');

  const formattedEur = formatCurrencyWithSettings(2500, 'EUR', 'european');
  assert.ok(formattedEur.includes('€') || formattedEur.includes('EUR'), 'Must format with Euro symbol');

  const formattedUsd = formatCurrency(1500);
  assert.ok(formattedUsd.includes('$') || formattedUsd.includes('USD'));
});

test('Attribution E2E: Official developer verified in site configurations', () => {
  assert.equal(siteConfig.developer.name, 'Nithiarasu');
  assert.equal(siteConfig.developer.email, 'nithiarasu248@gmail.com');
  assert.equal(siteConfig.developer.contact, '9952281794');
});
