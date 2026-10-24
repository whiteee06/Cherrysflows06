/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCategoryMetadata,
  calculateExpensePaymentState,
  calculateExpenseMetrics,
  filterAndSortExpenses,
  validateExpenseForm,
  calculateNextRecurringDate,
} from './expenses';
import { Expense, ExpensePayment, ExpenseCategory } from '../types/database';

test('resolveCategoryMetadata resolves standard and custom categories', () => {
  const metaSoftware = resolveCategoryMetadata('software_subscriptions');
  assert.equal(metaSoftware.name, 'Software Subscriptions');
  assert.equal(metaSoftware.color, '#3b82f6');

  const customCats: ExpenseCategory[] = [
    {
      id: 'cat_1',
      organization_id: 'org_1',
      user_id: 'u1',
      name: 'R&D Lab Tools',
      slug: 'rnd_tools',
      color: '#10b981',
      is_system: false,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  const metaCustom = resolveCategoryMetadata('rnd_tools', customCats);
  assert.equal(metaCustom.name, 'R&D Lab Tools');
  assert.equal(metaCustom.color, '#10b981');

  const metaFallback = resolveCategoryMetadata('custom_unregistered_tag');
  assert.equal(metaFallback.name, 'Custom Unregistered Tag');
});

test('calculateExpensePaymentState tracks unpaid, partial, and paid settlements strictly', () => {
  const exp: Expense = {
    id: 'exp_1',
    organization_id: 'org_1',
    user_id: 'u1',
    vendor: 'Cloud Host',
    description: 'Cloud hosting',
    amount: 500,
    currency: 'USD',
    category: 'software',
    payment_method: 'card',
    payment_status: 'unpaid',
    expense_date: '2026-03-01',
    created_at: '2026-03-01T00:00:00Z',
  };

  // No payments
  const unpaidState = calculateExpensePaymentState(exp, []);
  assert.equal(unpaidState.totalAmount, 500);
  assert.equal(unpaidState.amountPaid, 0);
  assert.equal(unpaidState.outstandingBalance, 500);
  assert.equal(unpaidState.paymentStatus, 'unpaid');
  assert.equal(unpaidState.isFullyPaid, false);

  // Partial payment
  const payments1: ExpensePayment[] = [
    {
      id: 'p1',
      organization_id: 'org_1',
      payment_number: 'EXP-PAY-001',
      expense_id: 'exp_1',
      amount: 200,
      payment_date: '2026-03-05',
      payment_method: 'bank_transfer',
      status: 'recorded',
      created_at: '2026-03-05T00:00:00Z',
    },
  ];
  const partialState = calculateExpensePaymentState(exp, payments1);
  assert.equal(partialState.amountPaid, 200);
  assert.equal(partialState.outstandingBalance, 300);
  assert.equal(partialState.paymentStatus, 'partially_paid');

  // Full settlement
  const payments2: ExpensePayment[] = [
    ...payments1,
    {
      id: 'p2',
      organization_id: 'org_1',
      payment_number: 'EXP-PAY-002',
      expense_id: 'exp_1',
      amount: 300,
      payment_date: '2026-03-10',
      payment_method: 'card',
      status: 'recorded',
      created_at: '2026-03-10T00:00:00Z',
    },
  ];
  const paidState = calculateExpensePaymentState(exp, payments2);
  assert.equal(paidState.amountPaid, 500);
  assert.equal(paidState.outstandingBalance, 0);
  assert.equal(paidState.paymentStatus, 'paid');
  assert.equal(paidState.isFullyPaid, true);
});

test('calculateExpenseMetrics computes aggregate totals and category distributions', () => {
  const expenses: Expense[] = [
    {
      id: 'e1',
      organization_id: 'org_1',
      user_id: 'u1',
      vendor: 'AWS',
      description: 'AWS billing',
      amount: 400,
      category: 'software',
      payment_method: 'card',
      payment_status: 'paid',
      expense_date: '2026-03-01',
      created_at: '2026-03-01T00:00:00Z',
    },
    {
      id: 'e2',
      organization_id: 'org_1',
      user_id: 'u1',
      vendor: 'Landlord Inc',
      description: 'Lease bill',
      amount: 1000,
      category: 'rent',
      payment_method: 'bank_transfer',
      payment_status: 'unpaid',
      expense_date: '2026-03-02',
      created_at: '2026-03-02T00:00:00Z',
    },
  ];

  const metrics = calculateExpenseMetrics(expenses, []);
  assert.equal(metrics.totalExpenses, 1400);
  assert.equal(metrics.paidExpenses, 400);
  assert.equal(metrics.unpaidExpenses, 1000);
  assert.equal(metrics.expensesCount, 2);
  assert.equal(metrics.paidCount, 1);
  assert.equal(metrics.unpaidCount, 1);
  assert.equal(metrics.categoryBreakdown.length, 2);
  assert.equal(metrics.categoryBreakdown[0].category, 'rent');
  assert.equal(metrics.categoryBreakdown[0].totalAmount, 1000);
});

test('filterAndSortExpenses filters by query, category, and payment status', () => {
  const expenses: Expense[] = [
    {
      id: 'e1',
      organization_id: 'org_1',
      user_id: 'u1',
      vendor: 'Supabase Cloud',
      title: 'Database hosting',
      description: 'Monthly pro plan',
      amount: 150,
      category: 'software',
      payment_method: 'card',
      payment_status: 'paid',
      expense_date: '2026-03-01',
      created_at: '2026-03-01T00:00:00Z',
    },
    {
      id: 'e2',
      organization_id: 'org_1',
      user_id: 'u1',
      vendor: 'Staples Office',
      title: 'Printer paper and pens',
      description: 'Stationery pack',
      amount: 80,
      category: 'office_supplies',
      payment_method: 'card',
      payment_status: 'unpaid',
      expense_date: '2026-03-05',
      created_at: '2026-03-05T00:00:00Z',
    },
  ];

  // Search filter
  const searchResult = filterAndSortExpenses(expenses, { search: 'database' });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, 'e1');

  // Category filter
  const catResult = filterAndSortExpenses(expenses, { category: 'office_supplies' });
  assert.equal(catResult.length, 1);
  assert.equal(catResult[0].id, 'e2');

  // Status filter
  const statusResult = filterAndSortExpenses(expenses, { paymentStatus: 'unpaid' });
  assert.equal(statusResult.length, 1);
  assert.equal(statusResult[0].id, 'e2');
});

test('validateExpenseForm validates required fields and positive amounts', () => {
  const invalid = validateExpenseForm({
    vendor: '',
    title: '',
    amount: -50,
    expense_date: '',
    category: '',
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.amount);
  assert.ok(invalid.errors.expense_date);
  assert.ok(invalid.errors.category);

  const valid = validateExpenseForm({
    vendor: 'Office Depo',
    amount: '129.99',
    expense_date: '2026-03-15',
    category: 'office_supplies',
  });
  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('calculateNextRecurringDate advances dates correctly for frequencies', () => {
  const nextWeekly = calculateNextRecurringDate('2026-03-01', 'weekly');
  assert.equal(nextWeekly, '2026-03-08');

  const nextMonthly = calculateNextRecurringDate('2026-03-01', 'monthly');
  assert.equal(nextMonthly, '2026-04-01');

  const nextQuarterly = calculateNextRecurringDate('2026-03-01', 'quarterly');
  assert.equal(nextQuarterly, '2026-06-01');

  const nextYearly = calculateNextRecurringDate('2026-03-01', 'yearly');
  assert.equal(nextYearly, '2027-03-01');
});
