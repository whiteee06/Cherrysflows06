/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  tax_identifier?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  avatar_url?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id?: string;
  organization_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  tax_number?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type ProductStatus = 'active' | 'inactive';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  user_id?: string;
  organization_id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  selling_price: number;
  unit_price?: number; // backward compatibility
  cost_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  unit_of_measure?: string; // backward compatibility
  status: ProductStatus;
  is_active?: boolean; // backward compatibility
  track_inventory?: boolean;
  created_at: string;
  updated_at?: string;
}

export type InventoryAdjustmentType = 'received' | 'correction' | 'damaged' | 'reduction';

export interface InventoryAdjustment {
  id: string;
  product_id: string;
  organization_id: string;
  user_id?: string;
  adjustment_type: InventoryAdjustmentType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_at: string;
  created_by: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity_on_hand: number;
  reorder_level: number;
  reorder_quantity: number;
  warehouse_location?: string;
  last_counted_at?: string;
  updated_at: string;
}

export type InventoryTransactionType = 'inbound' | 'outbound' | 'adjustment' | 'return';

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: InventoryTransactionType;
  quantity_delta: number;
  reference_type?: 'sales_order' | 'purchase_order' | 'manual_audit';
  reference_id?: string;
  notes?: string;
  performed_by: string;
  created_at: string;
}

export type SalesOrderStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled' | 'fulfilled';

export interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  organization_id?: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  created_at?: string;
}

export interface SalesOrder {
  id: string;
  organization_id: string;
  user_id?: string;
  order_number: string;
  customer_id: string;
  customer?: Customer;
  order_date: string;
  status: SalesOrderStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  items?: SalesOrderItem[];
  invoice_id?: string;
  payment_status?: 'unpaid' | 'partially_paid' | 'paid';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'voided';

export interface Invoice {
  id: string;
  organization_id: string;
  user_id?: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  sales_order_id?: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount?: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  items?: SalesOrderItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'other';
export type PaymentStatus = 'recorded' | 'reconciled' | 'reversed';

export interface Payment {
  id: string;
  organization_id: string;
  user_id?: string;
  invoice_id?: string;
  sales_order_id?: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  created_at: string;
}

export type ExpensePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  user_id?: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  is_system?: boolean;
  is_archived?: boolean;
  created_at: string;
}

export interface ExpensePayment {
  id: string;
  organization_id: string;
  user_id?: string;
  expense_id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  created_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  user_id?: string;
  expense_number?: string;
  title?: string;
  vendor: string;
  vendor_name?: string;
  description: string;
  category: string;
  category_id?: string;
  amount: number;
  amount_paid?: number;
  currency?: string;
  expense_date: string;
  payment_method: 'card' | 'bank_transfer' | 'cash' | 'other';
  payment_status?: ExpensePaymentStatus;
  receipt_url?: string;
  reference_number?: string;
  notes?: string;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  is_archived?: boolean;
  recorded_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlPreview?: string;
  connectionState: 'unconfigured' | 'connecting' | 'connected' | 'error';
  message: string;
}
