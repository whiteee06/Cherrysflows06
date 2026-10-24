/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatPhone, formatDate, slugify, getStatusBadgeVariant } from './formatters';

test('formatCurrency correctly formats standard numbers and handles edge cases', () => {
  const result = formatCurrency(1250.5);
  assert.ok(result.includes('1,250.50'));
  assert.equal(formatCurrency(NaN), '$0.00');
  assert.ok(formatCurrency(0).includes('0.00'));
});

test('formatPhone formats 10-digit phone numbers with +91 country prefix', () => {
  const phone = '9952281794';
  const formatted = formatPhone(phone);
  assert.equal(formatted, '+91 99522 81794');
});

test('slugify produces lower-case url-safe kebab-case strings', () => {
  assert.equal(slugify('Acme Retail Corp!'), 'acme-retail-corp');
  assert.equal(slugify('Cherryflow   Global--Services'), 'cherryflow-global-services');
});

test('getStatusBadgeVariant resolves correct theme semantics', () => {
  assert.equal(getStatusBadgeVariant('active'), 'success');
  assert.equal(getStatusBadgeVariant('paid'), 'success');
  assert.equal(getStatusBadgeVariant('pending'), 'warning');
  assert.equal(getStatusBadgeVariant('draft'), 'warning');
  assert.equal(getStatusBadgeVariant('overdue'), 'danger');
  assert.equal(getStatusBadgeVariant('unknown_tag'), 'default');
});

test('formatDate outputs readable date strings', () => {
  const formatted = formatDate('2026-10-21T12:00:00Z');
  assert.ok(formatted.includes('2026') || formatted.includes('Oct'));
  assert.equal(formatDate(''), '—');
});
