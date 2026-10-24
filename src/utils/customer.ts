/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer } from '../types/database';

export type CustomerSortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest';
export type CustomerStatusFilter = 'all' | 'active' | 'inactive';

export interface CustomerFormValues {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  status: 'active' | 'inactive';
}

export interface CustomerValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Validates customer form values
 */
export function validateCustomerForm(values: CustomerFormValues): {
  isValid: boolean;
  errors: CustomerValidationErrors;
} {
  const errors: CustomerValidationErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = 'Customer name is required';
  } else if (trimmedName.length < 2) {
    errors.name = 'Customer name must be at least 2 characters';
  }

  const trimmedEmail = values.email.trim();
  if (trimmedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    }
  }

  const trimmedPhone = values.phone.trim();
  if (trimmedPhone) {
    // Allows standard phone formats: +1-555-555-5555, (555) 555-5555, digits, spaces, hyphens
    const cleanDigits = trimmedPhone.replace(/[\s\-\(\)\+\.]/g, '');
    if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      errors.phone = 'Phone number should be between 7 and 15 digits';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Filters and sorts customer records
 */
export function filterAndSortCustomers(
  customers: Customer[],
  searchQuery: string,
  statusFilter: CustomerStatusFilter,
  sortOption: CustomerSortOption
): Customer[] {
  const query = searchQuery.trim().toLowerCase();

  // 1. Filter
  const filtered = customers.filter((cust) => {
    // Status filter
    if (statusFilter !== 'all' && cust.status !== statusFilter) {
      return false;
    }

    // Search query across name, company, email, phone, city
    if (query) {
      const matchName = cust.name.toLowerCase().includes(query);
      const matchCompany = (cust.company_name || '').toLowerCase().includes(query);
      const matchEmail = (cust.email || '').toLowerCase().includes(query);
      const matchPhone = (cust.phone || '').toLowerCase().includes(query);
      const matchCity = (cust.city || '').toLowerCase().includes(query);
      const matchAddress = (cust.address || cust.billing_address || '').toLowerCase().includes(query);

      return matchName || matchCompany || matchEmail || matchPhone || matchCity || matchAddress;
    }

    return true;
  });

  // 2. Sort
  return filtered.sort((a, b) => {
    switch (sortOption) {
      case 'name_asc':
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      case 'name_desc':
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      case 'newest': {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return timeB - timeA;
      }
      case 'oldest': {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return timeA - timeB;
      }
      default:
        return 0;
    }
  });
}

/**
 * Calculates customer statistics from actual records
 */
export function calculateCustomerStats(customers: Customer[]): {
  total: number;
  active: number;
  inactive: number;
} {
  let active = 0;
  let inactive = 0;

  for (const c of customers) {
    if (c.status === 'active') {
      active++;
    } else {
      inactive++;
    }
  }

  return {
    total: customers.length,
    active,
    inactive,
  };
}
