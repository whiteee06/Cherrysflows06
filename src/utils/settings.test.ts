/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultWorkspaceSettings,
  validateBusinessInfo,
  validateProfileSettings,
  validatePasswordChange,
  formatCurrencyWithSettings,
  formatDateWithSettings,
} from './settings';
import { siteConfig } from '../config/site';

test('getDefaultWorkspaceSettings returns valid enterprise defaults', () => {
  const defaults = getDefaultWorkspaceSettings();
  assert.ok(defaults.business.name);
  assert.equal(defaults.business.invoice_prefix, 'INV-');
  assert.equal(defaults.business.invoice_start_number, 1001);
  assert.equal(defaults.regional.currency, 'USD');
  assert.equal(defaults.regional.dateFormat, 'MMM DD, YYYY');
  assert.equal(defaults.notifications.notify_low_stock, true);
  assert.equal(defaults.notifications.low_stock_threshold, 15);
  assert.equal(defaults.application.theme, 'charcoal');
});

test('validateBusinessInfo rejects empty business name and invalid email/prefix', () => {
  const invalid = validateBusinessInfo({
    name: '',
    email: 'not-an-email',
    website: 'ftp://invalid.com',
    invoice_prefix: '***',
    invoice_start_number: 0,
  });

  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.website);
  assert.ok(invalid.errors.invoice_prefix);
  assert.ok(invalid.errors.invoice_start_number);
});

test('validateBusinessInfo accepts valid commercial configurations', () => {
  const valid = validateBusinessInfo({
    name: 'Apex Industrial Technologies',
    email: 'support@apexindustrial.com',
    website: 'https://apexindustrial.com',
    invoice_prefix: 'INV-2026/',
    invoice_start_number: 500,
  });

  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('validateProfileSettings requires a minimum 2-character display name', () => {
  const empty = validateProfileSettings({ full_name: '' });
  assert.equal(empty.isValid, false);
  assert.ok(empty.errors.full_name);

  const valid = validateProfileSettings({ full_name: 'Nithiarasu' });
  assert.equal(valid.isValid, true);
});

test('validatePasswordChange enforces security constraints', () => {
  // Empty current password
  const noCurrent = validatePasswordChange('', 'NewPass1234', 'NewPass1234');
  assert.equal(noCurrent.isValid, false);
  assert.ok(noCurrent.error?.includes('Current password is required'));

  // Short password (< 8 chars)
  const tooShort = validatePasswordChange('OldPass123', 'short', 'short');
  assert.equal(tooShort.isValid, false);
  assert.ok(tooShort.error?.includes('at least 8 characters'));

  // Mismatch
  const mismatch = validatePasswordChange('OldPass123', 'NewPass1234', 'DifferentPass4321');
  assert.equal(mismatch.isValid, false);
  assert.ok(mismatch.error?.includes('do not match'));

  // Identical to old
  const identical = validatePasswordChange('SamePass123', 'SamePass123', 'SamePass123');
  assert.equal(identical.isValid, false);
  assert.ok(identical.error?.includes('different from current'));

  // Valid change
  const valid = validatePasswordChange('OldPass123', 'SecurePass2026!', 'SecurePass2026!');
  assert.equal(valid.isValid, true);
  assert.equal(valid.error, null);
});

test('formatCurrencyWithSettings handles currency codes and number formats accurately', () => {
  const usdStandard = formatCurrencyWithSettings(1500.5, 'USD', 'standard');
  assert.ok(usdStandard.includes('1,500.50'));

  const eurEuropean = formatCurrencyWithSettings(1500.5, 'EUR', 'european');
  assert.ok(eurEuropean.includes('1.500,50') || eurEuropean.includes('1500,50'));

  const inrStandard = formatCurrencyWithSettings(250000, 'INR', 'standard');
  assert.ok(inrStandard.includes('2,50,000') || inrStandard.includes('250,000'));

  assert.equal(formatCurrencyWithSettings(NaN), '$0.00');
});

test('formatDateWithSettings formats according to selected regional patterns', () => {
  const testDate = new Date(2026, 9, 24, 14, 30); // Oct 24, 2026

  const mmmFormat = formatDateWithSettings(testDate, 'MMM DD, YYYY');
  assert.equal(mmmFormat, 'Oct 24, 2026');

  const ddmmyyyy = formatDateWithSettings(testDate, 'DD/MM/YYYY');
  assert.equal(ddmmyyyy, '24/10/2026');

  const yyyymmdd = formatDateWithSettings(testDate, 'YYYY-MM-DD');
  assert.equal(yyyymmdd, '2026-10-24');

  const withTime = formatDateWithSettings(testDate, 'YYYY-MM-DD', true);
  assert.equal(withTime, '2026-10-24 14:30');

  assert.equal(formatDateWithSettings(''), '—');
});

test('developer attribution is preserved in system configurations', () => {
  assert.equal(siteConfig.developer.name, 'Nithiarasu');
  assert.equal(siteConfig.developer.email, 'nithiarasu248@gmail.com');
  assert.equal(siteConfig.developer.contact, '9952281794');
});
