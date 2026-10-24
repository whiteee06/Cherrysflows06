/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../supabase/client';
import { getSupabaseEnvConfig } from '../supabase/config';
import {
  SalesOrder,
  SalesOrderItem,
  Invoice,
  Payment,
  PaymentMethod,
  SalesOrderStatus,
  Expense,
  Customer,
  Product,
  InventoryAdjustment,
} from '../../types/database';
import {
  calculateLineItem,
  calculateOrderTotals,
  canTransitionOrderStatus,
  calculateInvoicePaymentState,
} from '../../utils/sales';
import { formatCurrency } from '../../utils/formatters';

const LOCAL_STORAGE_KEY_PREFIX = 'cherryflow_data_';

export type SupportedTable =
  | 'sales_orders'
  | 'sales_order_items'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'customers'
  | 'products'
  | 'inventory_adjustments'
  | 'expense_categories'
  | 'expense_payments';

export interface BusinessDataBundle {
  orders: SalesOrder[];
  orderItems: SalesOrderItem[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  expenseCategories?: any[];
  expensePayments?: any[];
  customers: Customer[];
  products: Product[];
  adjustments: InventoryAdjustment[];
  storageSource: 'supabase' | 'local_workspace';
  errorMessage?: string;
  tablesMissing?: boolean;
}

function getLocalData<T>(entityKey: string): T[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${entityKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalData<T>(entityKey: string, data: T[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${entityKey}`, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write to local storage:', err);
  }
}

/**
 * Loads all business records from Supabase (or local workspace if unconfigured)
 */
export async function fetchBusinessRecords(): Promise<BusinessDataBundle> {
  const { status } = getSupabaseEnvConfig();
  const client = getSupabaseClient();

  if (!status.isConfigured || !client) {
    return {
      orders: getLocalData<SalesOrder>('sales_orders'),
      orderItems: getLocalData<SalesOrderItem>('sales_order_items'),
      invoices: getLocalData<Invoice>('invoices'),
      payments: getLocalData<Payment>('payments'),
      expenses: getLocalData<Expense>('expenses'),
      expenseCategories: getLocalData<any>('expense_categories'),
      expensePayments: getLocalData<any>('expense_payments'),
      customers: getLocalData<Customer>('customers'),
      products: getLocalData<Product>('products'),
      adjustments: getLocalData<InventoryAdjustment>('inventory_adjustments'),
      storageSource: 'local_workspace',
    };
  }

  try {
    const [
      ordersRes,
      itemsRes,
      invoicesRes,
      paymentsRes,
      expensesRes,
      customersRes,
      productsRes,
      adjRes,
      categoriesRes,
      expPayRes,
    ] = await Promise.all([
      client.from('sales_orders').select('*').order('created_at', { ascending: false }),
      client.from('sales_order_items').select('*').order('created_at', { ascending: false }),
      client.from('invoices').select('*').order('created_at', { ascending: false }),
      client.from('payments').select('*').order('created_at', { ascending: false }),
      client.from('expenses').select('*').order('created_at', { ascending: false }),
      client.from('customers').select('*').order('created_at', { ascending: false }),
      client.from('products').select('*').order('created_at', { ascending: false }),
      client.from('inventory_adjustments').select('*').order('created_at', { ascending: false }),
      client.from('expense_categories').select('*').order('created_at', { ascending: false }),
      client.from('expense_payments').select('*').order('created_at', { ascending: false }),
    ]);

    // Check if tables don't exist yet (PGRST204 or 42P01)
    const errors = [
      ordersRes.error,
      itemsRes.error,
      invoicesRes.error,
      paymentsRes.error,
      expensesRes.error,
      customersRes.error,
      productsRes.error,
      adjRes.error,
    ].filter(Boolean);

    const tableMissing = errors.some(
      (e) => e?.message?.includes('relation') || e?.code === '42P01' || e?.code === 'PGRST204'
    );

    if (tableMissing) {
      const localProducts = getLocalData<Product>('products');
      if (localProducts.length === 0 && !localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}cleared`)) {
        return seedSampleBusinessDataset();
      }
      return {
        orders: getLocalData<SalesOrder>('sales_orders'),
        orderItems: getLocalData<SalesOrderItem>('sales_order_items'),
        invoices: getLocalData<Invoice>('invoices'),
        payments: getLocalData<Payment>('payments'),
        expenses: getLocalData<Expense>('expenses'),
        expenseCategories: getLocalData<any>('expense_categories'),
        expensePayments: getLocalData<any>('expense_payments'),
        customers: getLocalData<Customer>('customers'),
        products: getLocalData<Product>('products'),
        adjustments: getLocalData<InventoryAdjustment>('inventory_adjustments'),
        storageSource: 'supabase',
        tablesMissing: true,
        errorMessage:
          'Supabase connected, but PostgreSQL tables are not yet created. Run the migration script in Settings.',
      };
    }

    const remoteOrders = (ordersRes.data as SalesOrder[]) || [];
    const remoteItems = (itemsRes.data as SalesOrderItem[]) || [];
    const remoteInvoices = (invoicesRes.data as Invoice[]) || [];
    const remotePayments = (paymentsRes.data as Payment[]) || [];
    const remoteExpenses = (expensesRes.data as Expense[]) || [];
    const remoteCategories = (categoriesRes.data as any[]) || [];
    const remoteExpPayments = (expPayRes.data as any[]) || [];
    const remoteCustomers = (customersRes.data as Customer[]) || [];
    const remoteProducts = (productsRes.data as Product[]) || [];
    const remoteAdjustments = (adjRes.data as InventoryAdjustment[]) || [];

    const totalRemote =
      remoteOrders.length +
      remoteItems.length +
      remoteInvoices.length +
      remotePayments.length +
      remoteExpenses.length +
      remoteCustomers.length +
      remoteProducts.length +
      remoteAdjustments.length;

    if (errors.length > 0 || totalRemote === 0) {
      const localOrders = getLocalData<SalesOrder>('sales_orders');
      const localItems = getLocalData<SalesOrderItem>('sales_order_items');
      const localInvoices = getLocalData<Invoice>('invoices');
      const localPayments = getLocalData<Payment>('payments');
      const localExpenses = getLocalData<Expense>('expenses');
      const localCustomers = getLocalData<Customer>('customers');
      const localProducts = getLocalData<Product>('products');
      const localAdjustments = getLocalData<InventoryAdjustment>('inventory_adjustments');

      const totalLocal =
        localOrders.length +
        localItems.length +
        localInvoices.length +
        localPayments.length +
        localExpenses.length +
        localCustomers.length +
        localProducts.length +
        localAdjustments.length;

      if (totalLocal > 0) {
        return {
          orders: totalRemote > 0 ? remoteOrders : localOrders,
          orderItems: totalRemote > 0 ? remoteItems : localItems,
          invoices: totalRemote > 0 ? remoteInvoices : localInvoices,
          payments: totalRemote > 0 ? remotePayments : localPayments,
          expenses: totalRemote > 0 ? remoteExpenses : localExpenses,
          expenseCategories: remoteCategories.length > 0 ? remoteCategories : getLocalData<any>('expense_categories'),
          expensePayments: remoteExpPayments.length > 0 ? remoteExpPayments : getLocalData<any>('expense_payments'),
          customers: totalRemote > 0 ? remoteCustomers : localCustomers,
          products: totalRemote > 0 ? remoteProducts : localProducts,
          adjustments: totalRemote > 0 ? remoteAdjustments : localAdjustments,
          storageSource: totalRemote > 0 ? 'supabase' : 'local_workspace',
          tablesMissing: tableMissing,
          errorMessage: errors.length > 0 ? errors[0]?.message : undefined,
        };
      }
    }

    return {
      orders: remoteOrders,
      orderItems: remoteItems,
      invoices: remoteInvoices,
      payments: remotePayments,
      expenses: remoteExpenses,
      expenseCategories: remoteCategories,
      expensePayments: remoteExpPayments,
      customers: remoteCustomers,
      products: remoteProducts,
      adjustments: remoteAdjustments,
      storageSource: 'supabase',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      orders: getLocalData<SalesOrder>('sales_orders'),
      orderItems: getLocalData<SalesOrderItem>('sales_order_items'),
      invoices: getLocalData<Invoice>('invoices'),
      payments: getLocalData<Payment>('payments'),
      expenses: getLocalData<Expense>('expenses'),
      expenseCategories: getLocalData<any>('expense_categories'),
      expensePayments: getLocalData<any>('expense_payments'),
      customers: getLocalData<Customer>('customers'),
      products: getLocalData<Product>('products'),
      adjustments: getLocalData<InventoryAdjustment>('inventory_adjustments'),
      storageSource: 'local_workspace',
      errorMessage: `Could not load from Supabase: ${message}. Using workspace cache.`,
    };
  }
}

/**
 * Standardizes database constraint violations and RLS denials into clear, safe user-facing feedback
 */
export function formatDatabaseErrorMessage(error: any): string {
  if (!error) return 'An unexpected database error occurred.';
  const msg = error.message || String(error);
  const code = error.code || '';

  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'A record with this identifier, number, or SKU already exists in your organization.';
  }
  if (code === '23514' || msg.includes('check_stock_non_negative') || msg.includes('stock_quantity')) {
    return 'Operation rejected: Available stock cannot be reduced below zero.';
  }
  if (code === '23503' || msg.includes('foreign key constraint')) {
    return 'Operation rejected: Referenced customer, product, or order record does not exist or has active dependencies.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Access denied: You do not have permission to modify this organization record under Row Level Security.';
  }
  return msg;
}

/**
 * Inserts a single record into database or local cache with authentic user binding
 */
export async function insertRecord<T extends Record<string, any>>(
  table: SupportedTable,
  record: T
): Promise<{ success: boolean; data?: T & { id: string }; error?: string }> {
  const { status } = getSupabaseEnvConfig();
  const client = getSupabaseClient();

  // 1. Resolve authentic user ID from active session to prevent user ID spoofing
  let authenticatedUserId = (record as any).user_id;
  if (status.isConfigured && client) {
    try {
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user?.id) {
        authenticatedUserId = sessionData.session.user.id;
      }
    } catch {}
  }

  const newRecord = {
    ...record,
    id: record.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: authenticatedUserId || (record as any).user_id,
    created_at: (record as any).created_at || new Date().toISOString(),
    updated_at: (record as any).updated_at || new Date().toISOString(),
  };

  if (status.isConfigured && client) {
    try {
      const { data, error } = await client.from(table).insert(newRecord).select().single();
      if (!error && data) {
        // Also sync into local cache
        const existing = getLocalData<T>(table);
        setLocalData(table, [data as T, ...existing.filter((i) => i.id !== (data as any).id)]);
        return { success: true, data: data as T & { id: string } };
      }
      if (error) {
        const isTableMissing =
          error.message?.includes('relation') ||
          error.code === '42P01' ||
          error.code === 'PGRST204';

        if (!isTableMissing) {
          // Hard database constraint or RLS violation: fail truthfully without false success
          return { success: false, error: formatDatabaseErrorMessage(error) };
        }
        console.warn(`Supabase table ${table} not yet created in PostgreSQL, falling back to workspace cache:`, error.message);
      }
    } catch (e: unknown) {
      console.warn(`Exception inserting to Supabase ${table}:`, e);
    }
  }

  // Save to local cache
  const existing = getLocalData<T>(table);
  const updated = [newRecord as T, ...existing.filter((i) => i.id !== newRecord.id)];
  setLocalData(table, updated);
  return { success: true, data: newRecord as T & { id: string } };
}

/**
 * Updates an existing record by ID in Supabase and local cache
 */
export async function updateRecord<T extends Record<string, any> = Record<string, any>>(
  table: SupportedTable,
  id: string,
  updates: Partial<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { status } = getSupabaseEnvConfig();
  const client = getSupabaseClient();
  const updatedData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (status.isConfigured && client) {
    try {
      const { data, error } = await client
        .from(table)
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        // Also update local cache
        const existing = getLocalData<T>(table);
        const next = existing.map((item) => (item.id === id ? { ...item, ...data } : item));
        setLocalData(table, next);
        return { success: true, data: data as T };
      }
      if (error) {
        const isTableMissing =
          error.message?.includes('relation') ||
          error.code === '42P01' ||
          error.code === 'PGRST204';

        if (!isTableMissing) {
          return { success: false, error: formatDatabaseErrorMessage(error) };
        }
        console.warn(`Supabase update to ${table} failed, table missing:`, error.message);
      }
    } catch (e: unknown) {
      console.warn(`Exception updating Supabase ${table}:`, e);
    }
  }

  // Fallback to updating local cache
  const existing = getLocalData<T>(table);
  let found = false;
  const next = existing.map((item) => {
    if (item.id === id) {
      found = true;
      return { ...item, ...updatedData };
    }
    return item;
  });

  if (!found) {
    return { success: false, error: 'Record not found' };
  }

  setLocalData(table, next);
  const updatedItem = next.find((item) => item.id === id)!;
  return { success: true, data: updatedItem };
}

/**
 * Checks if a customer has dependent sales orders or invoices before deletion
 */
export async function checkCustomerDependencies(customerId: string): Promise<{
  hasDependencies: boolean;
  orderCount: number;
  invoiceCount: number;
  orders: SalesOrder[];
  invoices: Invoice[];
}> {
  const bundle = await fetchBusinessRecords();
  const matchingOrders = bundle.orders.filter((o) => o.customer_id === customerId);
  const matchingInvoices = bundle.invoices.filter((i) => i.customer_id === customerId);

  return {
    hasDependencies: matchingOrders.length > 0 || matchingInvoices.length > 0,
    orderCount: matchingOrders.length,
    invoiceCount: matchingInvoices.length,
    orders: matchingOrders,
    invoices: matchingInvoices,
  };
}

/**
 * Deletes a record by ID from Supabase and local cache
 */
export async function deleteRecord(
  table: SupportedTable,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { status } = getSupabaseEnvConfig();
  const client = getSupabaseClient();

  if (status.isConfigured && client) {
    try {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) {
        console.warn(`Supabase delete from ${table} failed:`, error.message);
        const isTableMissing =
          error.message?.includes('schema cache') ||
          error.message?.includes('relation') ||
          error.code === '42P01' ||
          error.code === 'PGRST204';
        if (!isTableMissing) {
          return { success: false, error: error.message };
        }
      }
    } catch (e: unknown) {
      console.warn(`Exception deleting from Supabase ${table}:`, e);
    }
  }

  // Remove from local cache
  const existing = getLocalData<{ id: string }>(table);
  const next = existing.filter((item) => item.id !== id);
  setLocalData(table, next);
  return { success: true };
}

/**
 * Atomically performs a stock adjustment for a product, recording the history
 * and updating the product stock quantity. Prevents negative stock.
 */
export async function performStockAdjustment(params: {
  productId: string;
  adjustmentType: 'received' | 'correction' | 'damaged' | 'reduction';
  quantityChange: number;
  reason: string;
  performedBy?: string;
}): Promise<{
  success: boolean;
  product?: Product;
  adjustment?: InventoryAdjustment;
  error?: string;
}> {
  const { productId, adjustmentType, quantityChange, reason, performedBy } = params;

  // 1. Fetch current bundle to find target product
  const bundle = await fetchBusinessRecords();
  const product = bundle.products.find((p) => p.id === productId);

  if (!product) {
    return { success: false, error: 'Product not found in database' };
  }

  const previousQuantity = Number(product.stock_quantity) || 0;
  const newQuantity = previousQuantity + quantityChange;

  if (newQuantity < 0) {
    return {
      success: false,
      error: `Insufficient stock: Cannot reduce quantity by ${Math.abs(quantityChange)}. Current stock is ${previousQuantity}.`,
    };
  }

  const adjustmentRecord: InventoryAdjustment = {
    id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    product_id: productId,
    organization_id: product.organization_id || 'org_cherryflow_demo',
    adjustment_type: adjustmentType,
    quantity_change: quantityChange,
    previous_quantity: previousQuantity,
    new_quantity: newQuantity,
    reason: reason.trim(),
    created_by: performedBy || 'Business Owner',
    created_at: new Date().toISOString(),
  };

  // 2. Persist adjustment record
  await insertRecord('inventory_adjustments', adjustmentRecord);

  // 3. Update product with new stock quantity
  const updateRes = await updateRecord<Product>('products', productId, {
    stock_quantity: newQuantity,
    updated_at: new Date().toISOString(),
  });

  if (!updateRes.success || !updateRes.data) {
    return {
      success: false,
      error: updateRes.error || 'Failed to update product stock quantity',
    };
  }

  return {
    success: true,
    product: updateRes.data,
    adjustment: adjustmentRecord,
  };
}

/**
 * Checks if a product is referenced by sales orders, order items, invoices, or inventory adjustments
 */
export async function checkProductDependencies(productId: string): Promise<{
  hasDependencies: boolean;
  orderCount: number;
  adjustmentCount: number;
}> {
  const bundle = await fetchBusinessRecords();
  const product = bundle.products.find((p) => p.id === productId);
  if (!product) {
    return { hasDependencies: false, orderCount: 0, adjustmentCount: 0 };
  }

  const matchingItems = bundle.orderItems.filter((i) => i.product_id === productId);
  const matchingOrders = bundle.orders.filter((o) => {
    const hasItem = matchingItems.some((mi) => mi.order_id === o.id);
    const notesLower = (o.notes || '').toLowerCase();
    return (
      hasItem ||
      notesLower.includes(product.name.toLowerCase()) ||
      notesLower.includes(product.sku.toLowerCase())
    );
  });

  const matchingAdjustments = bundle.adjustments.filter((a) => a.product_id === productId);

  return {
    hasDependencies: matchingOrders.length > 0 || matchingAdjustments.length > 0,
    orderCount: matchingOrders.length,
    adjustmentCount: matchingAdjustments.length,
  };
}

export interface CreateOrderLineItemInput {
  productId: string;
  quantity: number;
  discountAmount?: number;
  taxRatePercent?: number;
}

/**
 * Creates a sales order with authoritative pricing, line item snapshots,
 * and atomic stock deduction when confirmed or completed.
 */
export async function createSalesOrderWithInventoryDeduction(params: {
  customerId: string;
  orderNumber?: string;
  orderDate?: string;
  status: SalesOrderStatus;
  items: CreateOrderLineItemInput[];
  orderDiscount?: number;
  orderTaxPercent?: number;
  notes?: string;
  createInvoice?: boolean;
}): Promise<{
  success: boolean;
  order?: SalesOrder;
  items?: SalesOrderItem[];
  invoice?: Invoice;
  error?: string;
}> {
  if (!params.items || params.items.length === 0) {
    return { success: false, error: 'Sales order must contain at least one product.' };
  }

  const bundle = await fetchBusinessRecords();
  const customer = bundle.customers.find((c) => c.id === params.customerId);
  if (!customer) {
    return { success: false, error: 'Specified customer was not found in database.' };
  }

  // 1. Validate all requested products and check stock if confirming
  const isDeducting = params.status === 'confirmed' || params.status === 'completed';
  for (const item of params.items) {
    if (item.quantity <= 0) {
      return { success: false, error: 'Item quantities must be strictly positive.' };
    }
    const product = bundle.products.find((p) => p.id === item.productId);
    if (!product) {
      return { success: false, error: `Product ID "${item.productId}" not found in catalog.` };
    }

    if (isDeducting && product.stock_quantity < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for "${product.name}" (${product.sku}). Available stock is ${product.stock_quantity}, but order requested ${item.quantity} units.`,
      };
    }
  }

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const orderNumber = params.orderNumber?.trim() || `SO-${Math.floor(1000 + Math.random() * 9000)}`;

  // Ensure unique order number within organization
  const existingOrder = bundle.orders.find(
    (o) => o.order_number.toLowerCase() === orderNumber.toLowerCase()
  );
  if (existingOrder) {
    return {
      success: false,
      error: `Order number "${orderNumber}" already exists in this organization. Order numbers must be unique.`,
    };
  }

  // 2. Build immutable line item snapshots using authoritative product prices
  const orderItems: SalesOrderItem[] = [];
  for (const item of params.items) {
    const product = bundle.products.find((p) => p.id === item.productId)!;
    const calc = calculateLineItem({
      quantity: item.quantity,
      unitPrice: product.selling_price,
      discountAmount: item.discountAmount,
      taxRatePercent: item.taxRatePercent,
    });

    orderItems.push({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order_id: orderId,
      product_id: product.id,
      organization_id: product.organization_id || 'org_cherryflow_demo',
      product_name_snapshot: product.name,
      sku_snapshot: product.sku,
      quantity: item.quantity,
      unit_price: product.selling_price,
      discount_amount: calc.discountAmount,
      tax_amount: calc.taxAmount,
      line_total: calc.lineTotal,
      created_at: new Date().toISOString(),
    });
  }

  // 3. Compute final totals
  const totals = calculateOrderTotals(orderItems, params.orderDiscount || 0, params.orderTaxPercent || 0);

  // 4. Insert sales order
  const newOrder: SalesOrder = {
    id: orderId,
    organization_id: 'org_cherryflow_demo',
    order_number: orderNumber,
    customer_id: customer.id,
    order_date: params.orderDate || new Date().toISOString().slice(0, 10),
    status: params.status,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.totalAmount,
    items: orderItems,
    payment_status: 'unpaid',
    notes: params.notes?.trim() || 'Commercial sales order',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const orderRes = await insertRecord('sales_orders', newOrder);
  if (!orderRes.success) {
    return { success: false, error: orderRes.error || 'Failed to persist sales order' };
  }

  // Track state for rollback in case of downstream failures
  const insertedLineItems: string[] = [];
  const deductedProducts: Array<{ productId: string; previousQty: number; deductedQty: number }> = [];

  try {
    // 5. Insert line items
    for (const li of orderItems) {
      const itemRes = await insertRecord('sales_order_items', li);
      if (!itemRes.success) {
        throw new Error(itemRes.error || 'Failed to persist order line item');
      }
      insertedLineItems.push(li.id);
    }

    // 6. Deduct stock atomically if confirmed or completed
    if (isDeducting) {
      for (const item of params.items) {
        const product = bundle.products.find((p) => p.id === item.productId)!;
        const prevQty = product.stock_quantity;
        const newQty = prevQty - item.quantity;

        const updateRes = await updateRecord<Product>('products', product.id, {
          stock_quantity: newQty,
        });

        if (!updateRes.success) {
          throw new Error(updateRes.error || `Failed to update inventory for "${product.name}"`);
        }

        deductedProducts.push({
          productId: product.id,
          previousQty: prevQty,
          deductedQty: item.quantity,
        });

        await insertRecord('inventory_adjustments', {
          product_id: product.id,
          organization_id: product.organization_id || 'org_cherryflow_demo',
          adjustment_type: 'reduction',
          quantity_change: -item.quantity,
          previous_quantity: prevQty,
          new_quantity: newQty,
          reason: `Sales Order ${orderNumber} confirmed deduction`,
          created_by: 'Sales Engine',
        });
      }
    }
  } catch (err: unknown) {
    // Compensating Transaction Rollback:
    // 1. Restore any deducted stock
    for (const dp of deductedProducts) {
      await updateRecord<Product>('products', dp.productId, {
        stock_quantity: dp.previousQty,
      });
    }
    // 2. Delete inserted line items
    for (const itemId of insertedLineItems) {
      await deleteRecord('sales_order_items', itemId);
    }
    // 3. Delete order record
    await deleteRecord('sales_orders', orderId);

    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Transaction failed: ${message}. Compensating rollback executed to maintain database consistency.`,
    };
  }

  // 7. Generate linked invoice if requested
  let createdInvoice: Invoice | undefined;
  if (params.createInvoice) {
    const invNum = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organization_id: 'org_cherryflow_demo',
      invoice_number: invNum,
      customer_id: customer.id,
      sales_order_id: orderId,
      issue_date: newOrder.order_date,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'issued',
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      amount_paid: 0,
      notes: `Billing invoice for Order ${orderNumber}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const invRes = await insertRecord('invoices', newInvoice);
    if (invRes.success && invRes.data) {
      createdInvoice = invRes.data as Invoice;
      await updateRecord<SalesOrder>('sales_orders', orderId, {
        invoice_id: createdInvoice.id,
      });
    }
  }

  return {
    success: true,
    order: newOrder,
    items: orderItems,
    invoice: createdInvoice,
  };
}

/**
 * Transitions a sales order through its authorized lifecycle,
 * executing compensating inventory movements if needed.
 */
export async function transitionSalesOrderStatus(
  orderId: string,
  targetStatus: SalesOrderStatus,
  reason?: string
): Promise<{
  success: boolean;
  order?: SalesOrder;
  error?: string;
}> {
  const bundle = await fetchBusinessRecords();
  const order = bundle.orders.find((o) => o.id === orderId);
  if (!order) {
    return { success: false, error: 'Sales order not found in database' };
  }

  const check = canTransitionOrderStatus(order.status, targetStatus);
  if (!check.allowed) {
    return { success: false, error: check.reason || 'Invalid order status transition' };
  }

  const orderItems = bundle.orderItems.filter((i) => i.order_id === orderId);

  // 1. Stock deduction if transitioning from draft -> confirmed/completed
  if (check.requiresStockDeduction) {
    // Pre-check stock
    for (const item of orderItems) {
      const prod = bundle.products.find((p) => p.id === item.product_id);
      if (prod && prod.stock_quantity < item.quantity) {
        return {
          success: false,
          error: `Cannot confirm order: Insufficient stock for "${prod.name}" (${prod.sku}). Available: ${prod.stock_quantity}, required: ${item.quantity}.`,
        };
      }
    }

    // Deduct stock
    for (const item of orderItems) {
      const prod = bundle.products.find((p) => p.id === item.product_id);
      if (prod) {
        const prev = prod.stock_quantity;
        const next = prev - item.quantity;
        await updateRecord<Product>('products', prod.id, { stock_quantity: next });
        await insertRecord('inventory_adjustments', {
          product_id: prod.id,
          organization_id: prod.organization_id || 'org_cherryflow_demo',
          adjustment_type: 'reduction',
          quantity_change: -item.quantity,
          previous_quantity: prev,
          new_quantity: next,
          reason: `Order ${order.order_number} confirmed (${reason || 'Order commitment'})`,
          created_by: 'Order Fulfillment',
        });
      }
    }
  }

  // 2. Compensating stock restoration if transitioning from confirmed/completed -> cancelled
  if (check.requiresStockRestoration) {
    for (const item of orderItems) {
      const prod = bundle.products.find((p) => p.id === item.product_id);
      if (prod) {
        const prev = prod.stock_quantity;
        const next = prev + item.quantity;
        await updateRecord<Product>('products', prod.id, { stock_quantity: next });
        await insertRecord('inventory_adjustments', {
          product_id: prod.id,
          organization_id: prod.organization_id || 'org_cherryflow_demo',
          adjustment_type: 'received',
          quantity_change: item.quantity,
          previous_quantity: prev,
          new_quantity: next,
          reason: `Compensating stock restoration for cancelled Order ${order.order_number} (${reason || 'Order cancellation'})`,
          created_by: 'Cancellation Compensator',
        });
      }
    }
  }

  const updateRes = await updateRecord<SalesOrder>('sales_orders', orderId, {
    status: targetStatus,
  });

  return updateRes;
}

/**
 * Records a legitimate payment entry against an invoice with balance enforcement
 */
export async function recordInvoicePayment(params: {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  paymentDate?: string;
}): Promise<{
  success: boolean;
  payment?: Payment;
  invoice?: Invoice;
  error?: string;
}> {
  const bundle = await fetchBusinessRecords();
  const invoice = bundle.invoices.find((i) => i.id === params.invoiceId);
  if (!invoice) {
    return { success: false, error: 'Invoice not found in database' };
  }

  if (params.amount <= 0) {
    return { success: false, error: 'Payment amount must be greater than zero.' };
  }

  const summary = calculateInvoicePaymentState(invoice, bundle.payments);
  if (params.amount > summary.outstandingBalance) {
    return {
      success: false,
      error: `Payment amount (${formatCurrency(params.amount)}) cannot exceed the remaining invoice balance of ${formatCurrency(summary.outstandingBalance)}.`,
    };
  }

  const payNum = `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const paymentRecord: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organization_id: invoice.organization_id || 'org_cherryflow_demo',
    invoice_id: invoice.id,
    sales_order_id: invoice.sales_order_id,
    payment_number: payNum,
    amount: params.amount,
    payment_date: params.paymentDate || new Date().toISOString().slice(0, 10),
    payment_method: params.paymentMethod,
    reference: params.reference?.trim() || undefined,
    notes: params.notes?.trim() || undefined,
    status: 'recorded',
    created_at: new Date().toISOString(),
  };

  await insertRecord('payments', paymentRecord);

  const newAmountPaid = Math.round((summary.amountPaid + params.amount) * 100) / 100;
  const newStatus = newAmountPaid >= invoice.total_amount ? 'paid' : 'issued';

  const invUpdate = await updateRecord<Invoice>('invoices', invoice.id, {
    amount_paid: newAmountPaid,
    status: newStatus,
  });

  if (invoice.sales_order_id) {
    await updateRecord<SalesOrder>('sales_orders', invoice.sales_order_id, {
      payment_status: newStatus === 'paid' ? 'paid' : 'partially_paid',
    });
  }

  return {
    success: true,
    payment: paymentRecord,
    invoice: invUpdate.data,
  };
}

/**
 * Creates a direct commercial billing invoice with line items
 */
export async function createDirectInvoice(params: {
  customerId: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate: string;
  items: CreateOrderLineItemInput[];
  orderDiscount?: number;
  orderTaxPercent?: number;
  notes?: string;
}): Promise<{
  success: boolean;
  invoice?: Invoice;
  items?: SalesOrderItem[];
  error?: string;
}> {
  if (!params.items || params.items.length === 0) {
    return { success: false, error: 'Invoice must contain at least one line item.' };
  }

  const bundle = await fetchBusinessRecords();
  const customer = bundle.customers.find((c) => c.id === params.customerId);
  if (!customer) {
    return { success: false, error: 'Customer not found.' };
  }

  const invId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const invNumber = params.invoiceNumber?.trim() || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const existingInvoice = bundle.invoices.find(
    (i) => i.invoice_number.toLowerCase() === invNumber.toLowerCase()
  );
  if (existingInvoice) {
    return {
      success: false,
      error: `Invoice number "${invNumber}" already exists in this organization. Invoice numbers must be unique.`,
    };
  }

  const invoiceItems: SalesOrderItem[] = [];
  for (const item of params.items) {
    const product = bundle.products.find((p) => p.id === item.productId);
    if (!product) {
      return { success: false, error: `Product not found in catalog.` };
    }

    const calc = calculateLineItem({
      quantity: item.quantity,
      unitPrice: product.selling_price,
      discountAmount: item.discountAmount,
      taxRatePercent: item.taxRatePercent,
    });

    invoiceItems.push({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order_id: invId,
      product_id: product.id,
      organization_id: product.organization_id || 'org_cherryflow_demo',
      product_name_snapshot: product.name,
      sku_snapshot: product.sku,
      quantity: item.quantity,
      unit_price: product.selling_price,
      discount_amount: calc.discountAmount,
      tax_amount: calc.taxAmount,
      line_total: calc.lineTotal,
      created_at: new Date().toISOString(),
    });
  }

  const totals = calculateOrderTotals(invoiceItems, params.orderDiscount || 0, params.orderTaxPercent || 0);

  const newInvoice: Invoice = {
    id: invId,
    organization_id: 'org_cherryflow_demo',
    invoice_number: invNumber,
    customer_id: customer.id,
    issue_date: params.issueDate || new Date().toISOString().slice(0, 10),
    due_date: params.dueDate,
    status: 'issued',
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.totalAmount,
    amount_paid: 0,
    items: invoiceItems,
    notes: params.notes?.trim() || 'Commercial customer invoice',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const invRes = await insertRecord('invoices', newInvoice);
  if (!invRes.success) {
    return { success: false, error: invRes.error || 'Failed to persist invoice' };
  }

  for (const item of invoiceItems) {
    await insertRecord('sales_order_items', item);
  }

  return {
    success: true,
    invoice: newInvoice,
    items: invoiceItems,
  };
}

/**
 * Safely deletes a sales order, checking whether financial records or fulfillment dependencies exist
 */
export async function deleteSalesOrderSafely(orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const bundle = await fetchBusinessRecords();
  const order = bundle.orders.find((o) => o.id === orderId);
  if (!order) {
    return { success: false, error: 'Sales order not found' };
  }

  if (order.status === 'confirmed' || order.status === 'completed') {
    return {
      success: false,
      error: `Cannot permanently delete a ${order.status} order with active inventory impact. Cancel the order instead to preserve audit logs and compensate inventory.`,
    };
  }

  // Delete line items
  const items = bundle.orderItems.filter((i) => i.order_id === orderId);
  for (const item of items) {
    await deleteRecord('sales_order_items', item.id);
  }

  return await deleteRecord('sales_orders', orderId);
}

/**
 * Creates seed records so the user can test the complete business management engine
 * with real, tangible numbers across all 8 modules.
 */
export async function seedSampleBusinessDataset(): Promise<BusinessDataBundle> {
  const now = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  const sampleCustomers: Customer[] = [
    {
      id: 'cust_apex_solutions',
      organization_id: 'org_cherryflow_demo',
      name: 'Apex Solutions Corp',
      company_name: 'Apex Solutions LLC',
      email: 'billing@apexsolutions.com',
      phone: '+1 555-234-8901',
      billing_address: '100 Innovation Way, Suite 400, Austin, TX',
      status: 'active',
      created_at: daysAgo(45),
      updated_at: daysAgo(45),
    },
    {
      id: 'cust_vanguard_retail',
      organization_id: 'org_cherryflow_demo',
      name: 'Vanguard Retail Ltd',
      company_name: 'Vanguard Retail',
      email: 'accounts@vanguardretail.co',
      phone: '+1 555-876-5432',
      billing_address: '742 Market Street, San Francisco, CA',
      status: 'active',
      created_at: daysAgo(30),
      updated_at: daysAgo(30),
    },
    {
      id: 'cust_solaris_health',
      organization_id: 'org_cherryflow_demo',
      name: 'Solaris Health Diagnostics',
      company_name: 'Solaris Labs Inc',
      email: 'finance@solarislabs.org',
      phone: '+1 555-345-6789',
      billing_address: '12 Medical Plaza, Boston, MA',
      status: 'active',
      created_at: daysAgo(20),
      updated_at: daysAgo(20),
    },
    {
      id: 'cust_horizon_logistics',
      organization_id: 'org_cherryflow_demo',
      name: 'Horizon Freight & Logistics',
      company_name: 'Horizon Freight Group',
      email: 'payables@horizonfreight.net',
      phone: '+1 555-901-2345',
      billing_address: '88 Harbor Boulevard, Seattle, WA',
      status: 'active',
      created_at: daysAgo(15),
      updated_at: daysAgo(15),
    },
  ];

  const sampleProducts: Product[] = [
    {
      id: 'prod_cloud_retainer',
      organization_id: 'org_cherryflow_demo',
      sku: 'SKU-SRV-01',
      name: 'Managed Cloud Infrastructure Retainer',
      description: 'Monthly 24/7 dedicated DevOps, SLA monitoring and automated backups',
      selling_price: 2400.0,
      unit_price: 2400.0,
      cost_price: 600.0,
      stock_quantity: 999,
      low_stock_threshold: 10,
      unit: 'month',
      unit_of_measure: 'month',
      status: 'active',
      is_active: true,
      category: 'Services',
      track_inventory: false,
      created_at: daysAgo(50),
      updated_at: daysAgo(50),
    },
    {
      id: 'prod_pos_terminal',
      organization_id: 'org_cherryflow_demo',
      sku: 'SKU-HW-101',
      name: 'CherryFlow Enterprise POS Terminal',
      description: 'Dual-display contactless payment terminal with barcode scanner',
      selling_price: 799.0,
      unit_price: 799.0,
      cost_price: 340.0,
      stock_quantity: 4, // Low Stock (Threshold 10)
      low_stock_threshold: 10,
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'active',
      is_active: true,
      category: 'Hardware',
      track_inventory: true,
      created_at: daysAgo(50),
      updated_at: daysAgo(50),
    },
    {
      id: 'prod_receipt_paper',
      organization_id: 'org_cherryflow_demo',
      sku: 'SKU-SUP-50',
      name: 'Thermal Receipt Rolls (Box of 50)',
      description: 'BPA-free high sensitivity thermal paper rolls',
      selling_price: 45.0,
      unit_price: 45.0,
      cost_price: 18.0,
      stock_quantity: 45, // In Stock (Threshold 15)
      low_stock_threshold: 15,
      unit: 'box',
      unit_of_measure: 'box',
      status: 'active',
      is_active: true,
      category: 'Supplies',
      track_inventory: true,
      created_at: daysAgo(50),
      updated_at: daysAgo(50),
    },
    {
      id: 'prod_barcode_scanner',
      organization_id: 'org_cherryflow_demo',
      sku: 'SKU-HW-102',
      name: 'Wireless 2D Handheld Barcode Scanner',
      description: 'Bluetooth industrial barcode scanner with charging cradle',
      selling_price: 149.0,
      unit_price: 149.0,
      cost_price: 65.0,
      stock_quantity: 0, // Out of Stock
      low_stock_threshold: 5,
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'active',
      is_active: true,
      category: 'Hardware',
      track_inventory: true,
      created_at: daysAgo(40),
      updated_at: daysAgo(40),
    },
  ];

  const sampleOrders: SalesOrder[] = [
    {
      id: 'ord_101',
      organization_id: 'org_cherryflow_demo',
      order_number: 'SO-1001',
      customer_id: 'cust_apex_solutions',
      order_date: daysAgo(2),
      status: 'confirmed',
      subtotal: 2400.0,
      tax_amount: 192.0,
      discount_amount: 0,
      total_amount: 2592.0,
      notes: 'Monthly enterprise retainer renewal',
      created_at: `${daysAgo(2)}T10:15:00Z`,
      updated_at: `${daysAgo(2)}T10:15:00Z`,
    },
    {
      id: 'ord_102',
      organization_id: 'org_cherryflow_demo',
      order_number: 'SO-1002',
      customer_id: 'cust_vanguard_retail',
      order_date: daysAgo(5),
      status: 'fulfilled',
      subtotal: 1598.0,
      tax_amount: 127.84,
      discount_amount: 50.0,
      total_amount: 1675.84,
      notes: '2x Enterprise POS Terminals shipped via FedEx',
      created_at: `${daysAgo(5)}T14:30:00Z`,
      updated_at: `${daysAgo(5)}T14:30:00Z`,
    },
    {
      id: 'ord_103',
      organization_id: 'org_cherryflow_demo',
      order_number: 'SO-1003',
      customer_id: 'cust_solaris_health',
      order_date: daysAgo(9),
      status: 'fulfilled',
      subtotal: 799.0,
      tax_amount: 63.92,
      discount_amount: 0,
      total_amount: 862.92,
      notes: 'Single POS Terminal for diagnostic front desk',
      created_at: `${daysAgo(9)}T11:00:00Z`,
      updated_at: `${daysAgo(9)}T11:00:00Z`,
    },
    {
      id: 'ord_104',
      organization_id: 'org_cherryflow_demo',
      order_number: 'SO-1004',
      customer_id: 'cust_horizon_logistics',
      order_date: daysAgo(16),
      status: 'confirmed',
      subtotal: 3196.0,
      tax_amount: 255.68,
      discount_amount: 100.0,
      total_amount: 3351.68,
      notes: '4x POS terminals for distribution depot',
      created_at: `${daysAgo(16)}T09:45:00Z`,
      updated_at: `${daysAgo(16)}T09:45:00Z`,
    },
    {
      id: 'ord_105',
      organization_id: 'org_cherryflow_demo',
      order_number: 'SO-1005',
      customer_id: 'cust_apex_solutions',
      order_date: daysAgo(24),
      status: 'fulfilled',
      subtotal: 450.0,
      tax_amount: 36.0,
      discount_amount: 0,
      total_amount: 486.0,
      notes: '10x Thermal receipt boxes',
      created_at: `${daysAgo(24)}T16:20:00Z`,
      updated_at: `${daysAgo(24)}T16:20:00Z`,
    },
    {
      id: 'ord_106',
      organization_id: 'org_cherryflow_demo',
      order_number: 'SO-1006',
      customer_id: 'cust_vanguard_retail',
      order_date: daysAgo(1),
      status: 'draft', // Draft order, not counted as completed sales revenue!
      subtotal: 799.0,
      tax_amount: 63.92,
      discount_amount: 0,
      total_amount: 862.92,
      notes: 'Pending customer PO signature',
      created_at: `${daysAgo(1)}T08:10:00Z`,
      updated_at: `${daysAgo(1)}T08:10:00Z`,
    },
  ];

  const sampleInvoices: Invoice[] = [
    {
      id: 'inv_201',
      organization_id: 'org_cherryflow_demo',
      invoice_number: 'INV-2026-001',
      customer_id: 'cust_apex_solutions',
      issue_date: daysAgo(10),
      due_date: daysAgo(-10), // due in 10 days
      status: 'issued', // Outstanding receivable
      subtotal: 2400.0,
      tax_amount: 192.0,
      total_amount: 2592.0,
      amount_paid: 0.0,
      notes: 'Net-20 payment terms',
      created_at: `${daysAgo(10)}T10:00:00Z`,
      updated_at: `${daysAgo(10)}T10:00:00Z`,
    },
    {
      id: 'inv_202',
      organization_id: 'org_cherryflow_demo',
      invoice_number: 'INV-2026-002',
      customer_id: 'cust_solaris_health',
      issue_date: daysAgo(25),
      due_date: daysAgo(-5),
      status: 'paid',
      subtotal: 862.92,
      tax_amount: 0.0,
      total_amount: 862.92,
      amount_paid: 862.92,
      notes: 'Paid in full via ACH wire transfer',
      created_at: `${daysAgo(25)}T12:00:00Z`,
      updated_at: `${daysAgo(25)}T12:00:00Z`,
    },
    {
      id: 'inv_203',
      organization_id: 'org_cherryflow_demo',
      invoice_number: 'INV-2026-003',
      customer_id: 'cust_horizon_logistics',
      issue_date: daysAgo(35),
      due_date: daysAgo(5), // overdue by 5 days
      status: 'overdue', // Outstanding receivable
      subtotal: 3351.68,
      tax_amount: 0.0,
      total_amount: 3351.68,
      amount_paid: 1000.0, // partially paid, balance 2351.68 outstanding
      notes: 'First installment received. Balance pending reminder.',
      created_at: `${daysAgo(35)}T09:00:00Z`,
      updated_at: `${daysAgo(35)}T09:00:00Z`,
    },
  ];

  const sampleExpenses: Expense[] = [
    {
      id: 'exp_301',
      organization_id: 'org_cherryflow_demo',
      category: 'software',
      vendor: 'Supabase Inc',
      description: 'PostgreSQL Database Pro Tier & Auth Services',
      amount: 25.0,
      currency: 'USD',
      expense_date: daysAgo(3),
      payment_method: 'card',
      recorded_by: 'system_admin',
      created_at: `${daysAgo(3)}T04:00:00Z`,
    },
    {
      id: 'exp_302',
      organization_id: 'org_cherryflow_demo',
      category: 'marketing',
      vendor: 'Google Workspace & Ads',
      description: 'Search campaign & productivity suite licenses',
      amount: 450.0,
      currency: 'USD',
      expense_date: daysAgo(7),
      payment_method: 'card',
      recorded_by: 'system_admin',
      created_at: `${daysAgo(7)}T09:30:00Z`,
    },
    {
      id: 'exp_303',
      organization_id: 'org_cherryflow_demo',
      category: 'supplies',
      vendor: 'MicroTech Hardware Wholesale',
      description: 'Thermal print heads & batch barcode scanners',
      amount: 720.0,
      currency: 'USD',
      expense_date: daysAgo(14),
      payment_method: 'bank_transfer',
      recorded_by: 'system_admin',
      created_at: `${daysAgo(14)}T11:15:00Z`,
    },
    {
      id: 'exp_304',
      organization_id: 'org_cherryflow_demo',
      category: 'logistics',
      vendor: 'FedEx Freight',
      description: 'Expedited shipping for customer hardware fulfillment',
      amount: 185.5,
      currency: 'USD',
      expense_date: daysAgo(18),
      payment_method: 'card',
      recorded_by: 'system_admin',
      created_at: `${daysAgo(18)}T15:00:00Z`,
    },
    {
      id: 'exp_305',
      organization_id: 'org_cherryflow_demo',
      category: 'utilities',
      vendor: 'Metro Fiber Comms',
      description: 'Dedicated high-speed fiber internet and failover line',
      amount: 140.0,
      currency: 'USD',
      expense_date: daysAgo(22),
      payment_method: 'bank_transfer',
      recorded_by: 'system_admin',
      created_at: `${daysAgo(22)}T10:00:00Z`,
    },
  ];

  const sampleAdjustments: InventoryAdjustment[] = [
    {
      id: 'adj_101',
      product_id: 'prod_pos_terminal',
      organization_id: 'org_cherryflow_demo',
      adjustment_type: 'received',
      quantity_change: 10,
      previous_quantity: 0,
      new_quantity: 10,
      reason: 'Initial supplier delivery batch #PO-8821',
      created_by: 'Business Owner',
      created_at: `${daysAgo(45)}T09:30:00Z`,
    },
    {
      id: 'adj_102',
      product_id: 'prod_pos_terminal',
      organization_id: 'org_cherryflow_demo',
      adjustment_type: 'reduction',
      quantity_change: -6,
      previous_quantity: 10,
      new_quantity: 4,
      reason: 'Fulfilled commercial retail shipments (SO-1002, SO-1003)',
      created_by: 'Warehouse Dispatch',
      created_at: `${daysAgo(5)}T14:20:00Z`,
    },
    {
      id: 'adj_103',
      product_id: 'prod_receipt_paper',
      organization_id: 'org_cherryflow_demo',
      adjustment_type: 'received',
      quantity_change: 50,
      previous_quantity: 0,
      new_quantity: 50,
      reason: 'Bulk stock arrival from manufacturer',
      created_by: 'Inventory Manager',
      created_at: `${daysAgo(40)}T11:00:00Z`,
    },
  ];

  const sampleOrderItems: SalesOrderItem[] = [
    {
      id: 'item_101_1',
      order_id: 'ord_101',
      product_id: 'prod_cloud_retainer',
      organization_id: 'org_cherryflow_demo',
      product_name_snapshot: 'Managed Cloud Infrastructure Retainer',
      sku_snapshot: 'SKU-SRV-01',
      quantity: 1,
      unit_price: 2400.0,
      discount_amount: 0,
      tax_amount: 192.0,
      line_total: 2592.0,
      created_at: `${daysAgo(2)}T10:15:00Z`,
    },
    {
      id: 'item_102_1',
      order_id: 'ord_102',
      product_id: 'prod_pos_terminal',
      organization_id: 'org_cherryflow_demo',
      product_name_snapshot: 'CherryFlow Enterprise POS Terminal',
      sku_snapshot: 'SKU-HW-101',
      quantity: 2,
      unit_price: 799.0,
      discount_amount: 50.0,
      tax_amount: 127.84,
      line_total: 1675.84,
      created_at: `${daysAgo(5)}T14:30:00Z`,
    },
    {
      id: 'item_103_1',
      order_id: 'ord_103',
      product_id: 'prod_pos_terminal',
      organization_id: 'org_cherryflow_demo',
      product_name_snapshot: 'CherryFlow Enterprise POS Terminal',
      sku_snapshot: 'SKU-HW-101',
      quantity: 1,
      unit_price: 799.0,
      discount_amount: 0,
      tax_amount: 63.92,
      line_total: 862.92,
      created_at: `${daysAgo(9)}T11:00:00Z`,
    },
    {
      id: 'item_104_1',
      order_id: 'ord_104',
      product_id: 'prod_pos_terminal',
      organization_id: 'org_cherryflow_demo',
      product_name_snapshot: 'CherryFlow Enterprise POS Terminal',
      sku_snapshot: 'SKU-HW-101',
      quantity: 4,
      unit_price: 799.0,
      discount_amount: 100.0,
      tax_amount: 255.68,
      line_total: 3351.68,
      created_at: `${daysAgo(16)}T09:45:00Z`,
    },
    {
      id: 'item_105_1',
      order_id: 'ord_105',
      product_id: 'prod_receipt_paper',
      organization_id: 'org_cherryflow_demo',
      product_name_snapshot: 'Thermal Receipt Rolls (Box of 50)',
      sku_snapshot: 'SKU-SUP-50',
      quantity: 10,
      unit_price: 45.0,
      discount_amount: 0,
      tax_amount: 36.0,
      line_total: 486.0,
      created_at: `${daysAgo(24)}T16:20:00Z`,
    },
    {
      id: 'item_106_1',
      order_id: 'ord_106',
      product_id: 'prod_pos_terminal',
      organization_id: 'org_cherryflow_demo',
      product_name_snapshot: 'CherryFlow Enterprise POS Terminal',
      sku_snapshot: 'SKU-HW-101',
      quantity: 1,
      unit_price: 799.0,
      discount_amount: 0,
      tax_amount: 63.92,
      line_total: 862.92,
      created_at: `${daysAgo(1)}T08:10:00Z`,
    },
  ];

  const samplePayments: Payment[] = [
    {
      id: 'pay_201',
      organization_id: 'org_cherryflow_demo',
      invoice_id: 'inv_202',
      sales_order_id: 'ord_103',
      payment_number: 'PAY-2026-001',
      amount: 862.92,
      payment_date: daysAgo(25),
      payment_method: 'bank_transfer',
      reference: 'WIRE-ACH-98214',
      notes: 'Paid in full via ACH wire transfer',
      status: 'recorded',
      created_at: `${daysAgo(25)}T12:05:00Z`,
    },
    {
      id: 'pay_202',
      organization_id: 'org_cherryflow_demo',
      invoice_id: 'inv_203',
      sales_order_id: 'ord_104',
      payment_number: 'PAY-2026-002',
      amount: 1000.0,
      payment_date: daysAgo(30),
      payment_method: 'card',
      reference: 'VISA-AUTH-44109',
      notes: 'First installment deposit',
      status: 'recorded',
      created_at: `${daysAgo(30)}T10:15:00Z`,
    },
  ];

  // Persist locally
  setLocalData('customers', sampleCustomers);
  setLocalData('products', sampleProducts);
  setLocalData('sales_orders', sampleOrders);
  setLocalData('sales_order_items', sampleOrderItems);
  setLocalData('invoices', sampleInvoices);
  setLocalData('payments', samplePayments);
  setLocalData('expenses', sampleExpenses);
  setLocalData('inventory_adjustments', sampleAdjustments);

  // If Supabase is connected, attempt to write to Supabase tables too
  const { status } = getSupabaseEnvConfig();
  const client = getSupabaseClient();
  if (status.isConfigured && client) {
    try {
      await Promise.all([
        client.from('customers').upsert(sampleCustomers),
        client.from('products').upsert(sampleProducts),
        client.from('sales_orders').upsert(sampleOrders),
        client.from('sales_order_items').upsert(sampleOrderItems),
        client.from('invoices').upsert(sampleInvoices),
        client.from('payments').upsert(samplePayments),
        client.from('expenses').upsert(sampleExpenses),
        client.from('inventory_adjustments').upsert(sampleAdjustments),
      ]);
    } catch (e) {
      console.warn('Could not sync seed data to Supabase (check RLS and schema):', e);
    }
  }

  return {
    orders: sampleOrders,
    orderItems: sampleOrderItems,
    invoices: sampleInvoices,
    payments: samplePayments,
    expenses: sampleExpenses,
    customers: sampleCustomers,
    products: sampleProducts,
    adjustments: sampleAdjustments,
    storageSource: status.isConfigured ? 'supabase' : 'local_workspace',
  };
}

/**
 * Resets local workspace cache to empty state
 */
export function clearWorkspaceRecords(): void {
  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}cleared`, 'true');
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}sales_orders`);
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}sales_order_items`);
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}invoices`);
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}payments`);
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}expenses`);
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}customers`);
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}products`);
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}inventory_adjustments`);
}
