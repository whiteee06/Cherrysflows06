/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupabaseEnvConfig } from './config';
import { CHERRYFLOW_SCHEMA_TABLES, generateFullSqlSchema } from './schema';

test('getSupabaseEnvConfig detects missing credentials truthfully without inventing keys', () => {
  const prevUrl = process.env.VITE_SUPABASE_URL;
  const prevKey = process.env.VITE_SUPABASE_ANON_KEY;
  try {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    const { status } = getSupabaseEnvConfig();
    assert.equal(typeof status.isConfigured, 'boolean');
    assert.ok(status.message.length > 0);
    assert.equal(status.isConfigured, false);
    assert.equal(status.hasUrl, false);
    assert.equal(status.hasAnonKey, false);

    // Now test when both are provided
    process.env.VITE_SUPABASE_URL = 'https://demo-project.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake';
    const configured = getSupabaseEnvConfig();
    assert.equal(configured.status.isConfigured, true);
    assert.equal(configured.status.hasUrl, true);
    assert.equal(configured.status.hasAnonKey, true);
    assert.ok(configured.status.urlPreview?.includes('demo-project.supabase.co'));
  } finally {
    if (prevUrl !== undefined) process.env.VITE_SUPABASE_URL = prevUrl;
    else delete process.env.VITE_SUPABASE_URL;
    if (prevKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = prevKey;
    else delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

test('generateFullSqlSchema creates valid DDL containing all core business tables and Phase 2 profiles', () => {
  const sql = generateFullSqlSchema();
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.profiles'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.organizations'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.customers'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.products'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.inventory_items'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.inventory_adjustments'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.invoices'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.expenses'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.sales_orders'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.sales_order_items'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.payments'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.expense_categories'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.expense_payments'));
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'));
  assert.ok(sql.includes('handle_new_user'));
  assert.equal(CHERRYFLOW_SCHEMA_TABLES.length, 14);
});
