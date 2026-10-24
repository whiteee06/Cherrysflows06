/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCustomerForm,
  filterAndSortCustomers,
  calculateCustomerStats,
  CustomerFormValues,
} from './customer';
import { Customer } from '../types/database';

test('validateCustomerForm requires name and rejects empty or short names', () => {
  const invalidValues: CustomerFormValues = {
    name: '  ',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
    status: 'active',
  };

  const res = validateCustomerForm(invalidValues);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.name);

  const validValues: CustomerFormValues = {
    ...invalidValues,
    name: 'Apex Innovations',
  };
  const res2 = validateCustomerForm(validValues);
  assert.equal(res2.isValid, true);
  assert.equal(res2.errors.name, undefined);
});

test('validateCustomerForm validates email format when provided', () => {
  const invalidEmail: CustomerFormValues = {
    name: 'Valid Name',
    companyName: '',
    email: 'not-an-email',
    phone: '',
    address: '',
    city: '',
    notes: '',
    status: 'active',
  };

  const res = validateCustomerForm(invalidEmail);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.email);

  const validEmail: CustomerFormValues = {
    ...invalidEmail,
    email: 'client@company.com',
  };
  const res2 = validateCustomerForm(validEmail);
  assert.equal(res2.isValid, true);
  assert.equal(res2.errors.email, undefined);
});

test('filterAndSortCustomers filters by search query across multiple fields', () => {
  const sample: Customer[] = [
    {
      id: 'c1',
      organization_id: 'org1',
      name: 'Alice Johnson',
      company_name: 'Johnson & Co',
      email: 'alice@johnson.com',
      city: 'Austin',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'c2',
      organization_id: 'org1',
      name: 'Bob Smith',
      company_name: 'Smith Logistics',
      email: 'bob@smith.com',
      city: 'Boston',
      status: 'inactive',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    },
  ];

  // Search by name
  const matchAlice = filterAndSortCustomers(sample, 'alice', 'all', 'name_asc');
  assert.equal(matchAlice.length, 1);
  assert.equal(matchAlice[0].id, 'c1');

  // Search by city
  const matchBoston = filterAndSortCustomers(sample, 'boston', 'all', 'name_asc');
  assert.equal(matchBoston.length, 1);
  assert.equal(matchBoston[0].id, 'c2');

  // Filter by status
  const activeOnly = filterAndSortCustomers(sample, '', 'active', 'name_asc');
  assert.equal(activeOnly.length, 1);
  assert.equal(activeOnly[0].id, 'c1');

  // Sort newest
  const newestFirst = filterAndSortCustomers(sample, '', 'all', 'newest');
  assert.equal(newestFirst[0].id, 'c2');
  assert.equal(newestFirst[1].id, 'c1');
});

test('calculateCustomerStats correctly tallies active, inactive, and total records', () => {
  const sample: Customer[] = [
    { id: '1', organization_id: 'org1', name: 'A', status: 'active', created_at: '', updated_at: '' },
    { id: '2', organization_id: 'org1', name: 'B', status: 'active', created_at: '', updated_at: '' },
    { id: '3', organization_id: 'org1', name: 'C', status: 'inactive', created_at: '', updated_at: '' },
  ];

  const stats = calculateCustomerStats(sample);
  assert.equal(stats.total, 3);
  assert.equal(stats.active, 2);
  assert.equal(stats.inactive, 1);

  const emptyStats = calculateCustomerStats([]);
  assert.equal(emptyStats.total, 0);
  assert.equal(emptyStats.active, 0);
  assert.equal(emptyStats.inactive, 0);
});
