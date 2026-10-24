/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Expense,
  ExpenseCategory,
  ExpensePayment,
  ExpensePaymentStatus,
  RecurringFrequency,
} from '../types/database';

export interface CategorySummary {
  category: string;
  name: string;
  totalAmount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface ExpenseDashboardMetrics {
  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  expensesCount: number;
  paidCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  categoryBreakdown: CategorySummary[];
  averageExpense: number;
}

export interface ExpensePaymentState {
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: ExpensePaymentStatus;
  isFullyPaid: boolean;
  validPaymentsCount: number;
}

export const DEFAULT_EXPENSE_CATEGORIES: Array<{
  name: string;
  slug: string;
  description: string;
  color: string;
}> = [
  { name: 'Rent & Facilities', slug: 'rent', description: 'Office lease, warehouse rental, co-working spaces', color: '#f43f5e' },
  { name: 'Salaries & Payroll', slug: 'salaries', description: 'Employee wages, bonuses, contractor stipends', color: '#8b5cf6' },
  { name: 'Utilities', slug: 'utilities', description: 'Electricity, water, gas, internet, high-speed telecom', color: '#06b6d4' },
  { name: 'Transportation & Travel', slug: 'transportation', description: 'Fleet fuel, courier postage, flights, lodging', color: '#f59e0b' },
  { name: 'Marketing & Advertising', slug: 'marketing', description: 'Ad campaigns, sponsorship, trade shows, PR', color: '#ec4899' },
  { name: 'Office Supplies', slug: 'office_supplies', description: 'Stationery, packaging, small equipment, consumables', color: '#10b981' },
  { name: 'Software Subscriptions', slug: 'software_subscriptions', description: 'SaaS tools, cloud hosting, APIs, CRM licensing', color: '#3b82f6' },
  { name: 'Maintenance & Repairs', slug: 'maintenance', description: 'Equipment upkeep, facility maintenance, repairs', color: '#eab308' },
  { name: 'Other Operating Overhead', slug: 'other', description: 'Miscellaneous business disbursements and fees', color: '#71717a' },
];

/**
 * Resolves a human-friendly category name and theme color
 */
export function resolveCategoryMetadata(
  categorySlugOrName: string,
  customCategories: ExpenseCategory[] = []
): { name: string; color: string } {
  const custom = customCategories.find(
    (c) => c.slug.toLowerCase() === categorySlugOrName.toLowerCase() ||
           c.name.toLowerCase() === categorySlugOrName.toLowerCase()
  );
  if (custom) {
    return { name: custom.name, color: custom.color || '#f43f5e' };
  }

  const def = DEFAULT_EXPENSE_CATEGORIES.find(
    (c) => c.slug.toLowerCase() === categorySlugOrName.toLowerCase() ||
           c.name.toLowerCase() === categorySlugOrName.toLowerCase()
  );
  if (def) {
    return { name: def.name, color: def.color };
  }

  // Capitalize slug if not matched
  const formatted = categorySlugOrName
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return { name: formatted, color: '#a1a1aa' };
}

/**
 * Calculates payment settlement state for an expense record
 */
export function calculateExpensePaymentState(
  expense: Expense,
  payments: ExpensePayment[] = []
): ExpensePaymentState {
  const total = Math.max(0, Number(expense.amount) || 0);

  // Payments linked to this expense that are not reversed
  const linked = payments.filter(
    (p) => p.expense_id === expense.id && p.status !== 'reversed'
  );
  const sumPayments = linked.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Account for direct amount_paid field if present or fallback to status
  let amountPaid = sumPayments;
  if (amountPaid === 0 && expense.amount_paid !== undefined) {
    amountPaid = Number(expense.amount_paid) || 0;
  } else if (amountPaid === 0 && expense.payment_status === 'paid') {
    amountPaid = total;
  }

  amountPaid = Math.round(Math.min(amountPaid, total) * 100) / 100;
  const outstandingBalance = Math.max(0, Math.round((total - amountPaid) * 100) / 100);

  let paymentStatus: ExpensePaymentStatus = 'unpaid';
  if (amountPaid >= total && total > 0) {
    paymentStatus = 'paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'partially_paid';
  } else if (expense.payment_status === 'paid') {
    paymentStatus = 'paid';
  }

  return {
    totalAmount: total,
    amountPaid,
    outstandingBalance,
    paymentStatus,
    isFullyPaid: paymentStatus === 'paid',
    validPaymentsCount: linked.length,
  };
}

/**
 * Computes live expense overview metrics strictly from authorized database records
 */
export function calculateExpenseMetrics(
  expenses: Expense[],
  payments: ExpensePayment[] = [],
  customCategories: ExpenseCategory[] = [],
  options: { startDate?: string; endDate?: string } = {}
): ExpenseDashboardMetrics {
  const activeExpenses = expenses.filter((e) => !e.is_archived);

  let filtered = activeExpenses;
  if (options.startDate || options.endDate) {
    filtered = activeExpenses.filter((e) => {
      const d = (e.expense_date || e.created_at).slice(0, 10);
      if (options.startDate && d < options.startDate) return false;
      if (options.endDate && d > options.endDate) return false;
      return true;
    });
  }

  let totalExpenses = 0;
  let paidExpenses = 0;
  let unpaidExpenses = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  let partiallyPaidCount = 0;

  const categoryTotals = new Map<string, { amount: number; count: number }>();

  for (const exp of filtered) {
    const pState = calculateExpensePaymentState(exp, payments);
    totalExpenses += pState.totalAmount;
    paidExpenses += pState.amountPaid;
    unpaidExpenses += pState.outstandingBalance;

    if (pState.paymentStatus === 'paid') {
      paidCount++;
    } else if (pState.paymentStatus === 'partially_paid') {
      partiallyPaidCount++;
    } else {
      unpaidCount++;
    }

    const catKey = (exp.category || 'other').toLowerCase();
    const existing = categoryTotals.get(catKey) || { amount: 0, count: 0 };
    existing.amount += pState.totalAmount;
    existing.count += 1;
    categoryTotals.set(catKey, existing);
  }

  const categoryBreakdown: CategorySummary[] = Array.from(categoryTotals.entries())
    .map(([catKey, data]) => {
      const meta = resolveCategoryMetadata(catKey, customCategories);
      const percentage = totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 1000) / 10 : 0;
      return {
        category: catKey,
        name: meta.name,
        totalAmount: Math.round(data.amount * 100) / 100,
        count: data.count,
        percentage,
        color: meta.color,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    paidExpenses: Math.round(paidExpenses * 100) / 100,
    unpaidExpenses: Math.round(unpaidExpenses * 100) / 100,
    expensesCount: filtered.length,
    paidCount,
    unpaidCount,
    partiallyPaidCount,
    categoryBreakdown,
    averageExpense: filtered.length > 0 ? Math.round((totalExpenses / filtered.length) * 100) / 100 : 0,
  };
}

export interface ExpenseFilterOptions {
  search?: string;
  category?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  includeArchived?: boolean;
  sortBy?: 'expense_date' | 'amount' | 'category' | 'created_at';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Filters and sorts expenses deterministically
 */
export function filterAndSortExpenses(
  expenses: Expense[],
  options: ExpenseFilterOptions = {},
  payments: ExpensePayment[] = []
): Expense[] {
  const q = (options.search || '').toLowerCase().trim();
  const categoryFilter = options.category || 'all';
  const statusFilter = options.paymentStatus || 'all';
  const methodFilter = options.paymentMethod || 'all';
  const sortBy = options.sortBy || 'expense_date';
  const sortDirection = options.sortDirection || 'desc';

  return expenses
    .filter((exp) => {
      // Archival filter
      if (!options.includeArchived && exp.is_archived) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const cat = (exp.category || '').toLowerCase();
        if (cat !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // Payment Method filter
      if (methodFilter !== 'all') {
        if (exp.payment_method !== methodFilter) {
          return false;
        }
      }

      // Payment Status filter
      if (statusFilter !== 'all') {
        const pState = calculateExpensePaymentState(exp, payments);
        if (pState.paymentStatus !== statusFilter) {
          return false;
        }
      }

      // Date range filter
      const d = (exp.expense_date || exp.created_at).slice(0, 10);
      if (options.startDate && d < options.startDate) return false;
      if (options.endDate && d > options.endDate) return false;

      // Text search
      if (q) {
        const titleMatch = (exp.title || '').toLowerCase().includes(q);
        const vendorMatch = (exp.vendor || exp.vendor_name || '').toLowerCase().includes(q);
        const descMatch = (exp.description || '').toLowerCase().includes(q);
        const refMatch = (exp.reference_number || exp.expense_number || '').toLowerCase().includes(q);
        const notesMatch = (exp.notes || '').toLowerCase().includes(q);
        return titleMatch || vendorMatch || descMatch || refMatch || notesMatch;
      }

      return true;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'amount') {
        comp = (Number(a.amount) || 0) - (Number(b.amount) || 0);
      } else if (sortBy === 'category') {
        comp = (a.category || '').localeCompare(b.category || '');
      } else if (sortBy === 'created_at') {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        comp = timeA - timeB;
      } else {
        const timeA = new Date(a.expense_date || a.created_at).getTime();
        const timeB = new Date(b.expense_date || b.created_at).getTime();
        comp = timeA - timeB;
      }
      return sortDirection === 'desc' ? -comp : comp;
    });
}

/**
 * Calculates next date for recurring schedule
 */
export function calculateNextRecurringDate(
  baseDateStr: string,
  frequency: RecurringFrequency
): string {
  const d = new Date(baseDateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);

  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Validates input for adding/updating an expense
 */
export function validateExpenseForm(fields: {
  title?: string;
  vendor?: string;
  amount: string | number;
  expense_date: string;
  category: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const title = (fields.title || '').trim();
  const vendor = (fields.vendor || '').trim();
  if (!title && !vendor) {
    errors.title = 'Expense title or vendor name is required.';
  }

  const parsedAmount = typeof fields.amount === 'number' ? fields.amount : parseFloat(fields.amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.amount = 'Amount must be a valid positive number greater than 0.';
  }

  if (!fields.expense_date || isNaN(new Date(fields.expense_date).getTime())) {
    errors.expense_date = 'Please provide a valid expenditure date.';
  }

  if (!fields.category || !fields.category.trim()) {
    errors.category = 'Please select a valid expense category.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
