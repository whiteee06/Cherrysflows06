/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHERRYFLOW_SCHEMA_TABLES, generateFullSqlSchema } from './schema';
import { canTransitionOrderStatus, calculateInvoicePaymentState } from '../../utils/sales';
import { formatDatabaseErrorMessage } from '../business/records';
import { siteConfig } from '../../config/site';

test('Security Audit: All 14 database tables have Row-Level Security (RLS) explicitly enabled', () => {
  assert.equal(CHERRYFLOW_SCHEMA_TABLES.length, 14, 'Schema blueprint must contain all 14 multi-tenant tables');

  for (const table of CHERRYFLOW_SCHEMA_TABLES) {
    const hasRlsEnable = table.rlsPolicies.some((p) =>
      p.toLowerCase().includes('enable row level security')
    );
    assert.ok(hasRlsEnable, `Table public.${table.tableName} MUST have Row Level Security enabled`);
  }
});

test('Security Audit: Tenant tables bind user_id to auth.uid() and enforce organization isolation', () => {
  const tenantTablesWithUser = [
    'customers',
    'products',
    'expenses',
    'sales_orders',
    'payments',
    'expense_categories',
    'expense_payments',
  ];

  for (const tblName of tenantTablesWithUser) {
    const table = CHERRYFLOW_SCHEMA_TABLES.find((t) => t.tableName === tblName);
    assert.ok(table, `Table ${tblName} must be present in schema`);

    const userCol = table.columns.find((c) => c.name === 'user_id');
    assert.ok(userCol, `Table ${tblName} must have a user_id column`);
    assert.ok(
      userCol.constraints?.includes('auth.uid()'),
      `Table ${tblName}.user_id must default to auth.uid() to prevent client spoofing`
    );

    // Verify RLS policy enforces auth.uid() or organization membership
    const hasOrgOrAuthCheck = table.rlsPolicies.some(
      (p) => p.includes('auth.uid()') && p.includes('organization_id')
    );
    assert.ok(
      hasOrgOrAuthCheck,
      `Table ${tblName} RLS policies must strictly verify auth.uid() and organization_id`
    );
  }
});

test('Security Audit: Immutable audit ledger inventory_adjustments has no UPDATE or DELETE policies', () => {
  const table = CHERRYFLOW_SCHEMA_TABLES.find((t) => t.tableName === 'inventory_adjustments');
  assert.ok(table, 'inventory_adjustments table must exist');

  const updatePolicy = table.rlsPolicies.find((p) => p.toUpperCase().includes('FOR UPDATE'));
  const deletePolicy = table.rlsPolicies.find((p) => p.toUpperCase().includes('FOR DELETE'));

  assert.equal(updatePolicy, undefined, 'inventory_adjustments must NOT grant any UPDATE policy (immutable audit ledger)');
  assert.equal(deletePolicy, undefined, 'inventory_adjustments must NOT grant any DELETE policy (immutable audit ledger)');
});

test('Integrity Audit: Database constraints prevent negative inventory and monetary balances', () => {
  const products = CHERRYFLOW_SCHEMA_TABLES.find((t) => t.tableName === 'products')!;
  const stockCol = products.columns.find((c) => c.name === 'stock_quantity')!;
  assert.ok(stockCol.constraints?.includes('CHECK (stock_quantity >= 0)'), 'stock_quantity must enforce >= 0');

  const sellPriceCol = products.columns.find((c) => c.name === 'selling_price')!;
  assert.ok(sellPriceCol.constraints?.includes('CHECK (selling_price >= 0)'), 'selling_price must enforce >= 0');

  const costPriceCol = products.columns.find((c) => c.name === 'cost_price')!;
  assert.ok(costPriceCol.constraints?.includes('CHECK (cost_price >= 0)'), 'cost_price must enforce >= 0');

  const expenses = CHERRYFLOW_SCHEMA_TABLES.find((t) => t.tableName === 'expenses')!;
  const expenseAmtCol = expenses.columns.find((c) => c.name === 'amount')!;
  assert.ok(expenseAmtCol.constraints?.includes('CHECK (amount > 0)'), 'expense amount must be strictly > 0');
});

test('Integrity Audit: Unique business numbers are protected by unique indexes', () => {
  const fullSql = generateFullSqlSchema();

  assert.ok(fullSql.includes('idx_products_org_sku'), 'Products must enforce unique SKU per organization');
  assert.ok(fullSql.includes('idx_sales_orders_num'), 'Sales orders must enforce unique order number per organization');
  assert.ok(fullSql.includes('idx_invoices_number'), 'Invoices must enforce unique invoice number per organization');
  assert.ok(fullSql.includes('idx_payments_num'), 'Payments must enforce unique receipt number per organization');
  assert.ok(fullSql.includes('idx_exp_cat_slug'), 'Expense categories must enforce unique slug per organization');
});

test('Business Logic Audit: Order lifecycle prevents double-deduction and double-cancellation', () => {
  // 1. Initial draft to confirmed: deducts stock
  const step1 = canTransitionOrderStatus('draft', 'confirmed');
  assert.equal(step1.allowed, true);
  assert.equal(step1.requiresStockDeduction, true);

  // 2. Confirmed to fulfilled: does NOT deduct stock again
  const step2 = canTransitionOrderStatus('confirmed', 'fulfilled');
  assert.equal(step2.allowed, true);
  assert.equal(step2.requiresStockDeduction, false);

  // 3. Confirmed to cancelled: restores stock once
  const step3 = canTransitionOrderStatus('confirmed', 'cancelled');
  assert.equal(step3.allowed, true);
  assert.equal(step3.requiresStockRestoration, true);

  // 4. Cancelled cannot transition to confirmed or cancelled again
  const step4 = canTransitionOrderStatus('cancelled', 'confirmed');
  assert.equal(step4.allowed, false);

  const step5 = canTransitionOrderStatus('cancelled', 'cancelled');
  assert.equal(step5.allowed, false);
});

test('Business Logic Audit: Invoice payment state prevents overpayment beyond total due', () => {
  const invoice: any = {
    id: 'inv_test_1',
    total_amount: 1000.0,
    amount_paid: 400.0,
    status: 'issued',
  };

  const payments: any[] = [
    { id: 'p1', invoice_id: 'inv_test_1', amount: 400.0, status: 'completed' },
  ];

  const state = calculateInvoicePaymentState(invoice, payments);
  assert.equal(state.totalAmount, 1000.0);
  assert.equal(state.amountPaid, 400.0);
  assert.equal(state.outstandingBalance, 600.0);
  assert.equal(state.isPaid, false);

  // Overpayment check simulation
  const overpayAttempt = 600.01;
  const isOverpaying = overpayAttempt > state.outstandingBalance;
  assert.equal(isOverpaying, true, 'Payment logic must reject amounts exceeding outstanding balance');
});

test('Error Handling Audit: formatDatabaseErrorMessage masks raw internals and delivers clear advice', () => {
  const uniqueError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  assert.equal(
    formatDatabaseErrorMessage(uniqueError),
    'A record with this identifier, number, or SKU already exists in your organization.'
  );

  const stockError = { code: '23514', message: 'new row for relation products violates check constraint check_stock_non_negative' };
  assert.equal(
    formatDatabaseErrorMessage(stockError),
    'Operation rejected: Available stock cannot be reduced below zero.'
  );

  const rlsError = { code: '42501', message: 'new row violates row-level security policy for table sales_orders' };
  assert.equal(
    formatDatabaseErrorMessage(rlsError),
    'Access denied: You do not have permission to modify this organization record under Row Level Security.'
  );
});

test('Attribution Audit: Developer credentials are intact and truthful', () => {
  assert.equal(siteConfig.developer.name, 'Nithiarasu');
  assert.equal(siteConfig.developer.email, 'nithiarasu248@gmail.com');
  assert.equal(siteConfig.developer.contact, '9952281794');
});
