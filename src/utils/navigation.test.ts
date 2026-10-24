/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageTitle, getBreadcrumbs, isPathActive } from './navigation';

test('getPageTitle returns correct label for public and app routes', () => {
  assert.equal(getPageTitle('/'), 'Home');
  assert.equal(getPageTitle('/sign-in'), 'Sign In');
  assert.equal(getPageTitle('/update-password'), 'Update Password');
  assert.equal(getPageTitle('/developer'), 'Developer Profile');
  assert.equal(getPageTitle('/app/dashboard'), 'Dashboard');
  assert.equal(getPageTitle('/app/customers'), 'Customers');
  assert.equal(getPageTitle('/app/inventory'), 'Inventory');
  assert.equal(getPageTitle('/app/invoices'), 'Invoices');
  assert.equal(getPageTitle('/app/settings'), 'Settings');
  assert.equal(getPageTitle('/app/profile'), 'User Profile');
});

test('getBreadcrumbs constructs hierarchical breadcrumbs', () => {
  const crumbs = getBreadcrumbs('/app/customers');
  assert.equal(crumbs.length, 2);
  assert.equal(crumbs[0].label, 'Application');
  assert.equal(crumbs[0].path, '/app/dashboard');
  assert.equal(crumbs[1].label, 'Customers');
  assert.equal(crumbs[1].isCurrent, true);
});

test('isPathActive matches active route and prefix correctly', () => {
  assert.equal(isPathActive('/app/customers', '/app/customers'), true);
  assert.equal(isPathActive('/app/customers/123', '/app/customers'), true);
  assert.equal(isPathActive('/app/invoices', '/app/customers'), false);
});
