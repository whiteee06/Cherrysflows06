/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NavItem } from '../types/navigation';

export const APP_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    iconName: 'LayoutDashboard',
    description: 'Central command & operational overview',
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/app/customers',
    iconName: 'Users',
    description: 'Client records, contacts & accounts',
  },
  {
    id: 'products',
    label: 'Products',
    path: '/app/products',
    iconName: 'Package',
    description: 'Catalog, pricing & SKUs',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    path: '/app/inventory',
    iconName: 'Boxes',
    description: 'Stock levels, reorder points & audits',
  },
  {
    id: 'sales',
    label: 'Sales',
    path: '/app/sales',
    iconName: 'ShoppingBag',
    description: 'Sales orders & customer commitments',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    path: '/app/invoices',
    iconName: 'Receipt',
    description: 'Billing, collections & payment status',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    path: '/app/expenses',
    iconName: 'CreditCard',
    description: 'Operating costs, vendors & receipts',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/app/reports',
    iconName: 'BarChart3',
    description: 'Financial summaries & performance audits',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/app/settings',
    iconName: 'Settings',
    description: 'Organization, Supabase sync & Developer info',
  },
];

export const PUBLIC_NAV_LINKS = [
  { label: 'Overview', path: '/#overview' },
  { label: 'Architecture', path: '/#architecture' },
  { label: 'Developer', path: '/developer' },
];
