/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SalesOrder, Invoice, Expense, Customer } from './database';

export type DateRangeKey = '7d' | '30d' | '90d' | 'this_year' | 'all';

export interface DateRangeOption {
  key: DateRangeKey;
  label: string;
  description: string;
}

export interface BusinessOverviewMetrics {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  totalCustomers: number;
  totalOrders: number;
  outstandingInvoicesAmount: number;
  outstandingInvoicesCount: number;
  paidInvoicesAmount: number;
  averageOrderValue: number;
  hasData: boolean;
  accountingNote: string;
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  sales: number;
  expenses: number;
  netProfit: number;
  orderCount: number;
}

export interface TransactionRow {
  id: string;
  reference: string;
  customerName: string;
  date: string;
  amount: number;
  type: 'sale_order' | 'invoice';
  status: string;
  badgeVariant: 'cherry' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default';
}

export interface QuickActionItem {
  id: string;
  label: string;
  path: string;
  description: string;
  iconName: string;
}

export interface TopProductItem {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitsSold: number;
  revenue: number;
  rank: number;
}

