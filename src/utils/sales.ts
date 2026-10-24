/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  Invoice,
  Payment,
  Product,
  Customer,
} from '../types/database';
import { DateRangeKey } from '../types/analytics';
import { getDateRangeBounds } from './analytics';

export interface CalculatedLineItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface OrderFinancialSummary {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface InvoicePaymentSummary {
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  isPaid: boolean;
  isOverdue: boolean;
  validPaymentsCount: number;
}

export interface SalesDashboardMetrics {
  totalSales: number;
  ordersCount: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  confirmedOrdersCount: number;
  draftOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  totalInvoiced: number;
  paidAmount: number;
  totalCollectedRevenue: number;
  outstandingInvoiceBalance: number;
  openInvoicesCount: number;
  pendingInvoicesCount: number;
  paidInvoicesCount: number;
}

/**
 * Calculates deterministic line item financials with non-negative precision
 */
export function calculateLineItem(params: {
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRatePercent?: number;
}): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
} {
  const qty = Math.max(1, Math.floor(Number(params.quantity) || 1));
  const price = Math.max(0, Number(params.unitPrice) || 0);
  const subtotal = Math.round(qty * price * 100) / 100;

  const rawDiscount = Math.max(0, Number(params.discountAmount) || 0);
  const discountAmount = Math.min(rawDiscount, subtotal);
  const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;

  const taxRate = Math.max(0, Number(params.taxRatePercent) || 0);
  const taxAmount = Math.round(afterDiscount * (taxRate / 100) * 100) / 100;

  const lineTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    lineTotal,
  };
}

/**
 * Calculates complete order totals from line items and optional overall discount/tax.
 * Supports both camelCase and snake_case properties for robust compatibility.
 */
export function calculateOrderTotals(
  items: Array<{
    quantity: number;
    unitPrice?: number;
    unit_price?: number;
    discountAmount?: number;
    discount_amount?: number;
    taxAmount?: number;
    tax_amount?: number;
    lineTotal?: number;
    line_total?: number;
  }>,
  orderDiscount = 0,
  orderTaxPercent = 0
): OrderFinancialSummary {
  let subtotal = 0;
  let itemsDiscount = 0;
  let itemsTax = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unitPrice ?? item.unit_price) || 0);
    const lineSub = Math.round(qty * price * 100) / 100;
    subtotal += lineSub;
    itemsDiscount += Math.max(0, Number(item.discountAmount ?? item.discount_amount) || 0);
    itemsTax += Math.max(0, Number(item.taxAmount ?? item.tax_amount) || 0);
  }

  subtotal = Math.round(subtotal * 100) / 100;

  // Global order discount applied if items did not specify individual discounts
  const additionalDiscount = Math.max(0, Number(orderDiscount) || 0);
  const totalDiscount = Math.min(subtotal, Math.round((itemsDiscount + additionalDiscount) * 100) / 100);

  const taxableBase = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
  const additionalTax =
    orderTaxPercent > 0
      ? Math.round(taxableBase * (orderTaxPercent / 100) * 100) / 100
      : 0;

  const totalTax = Math.round((itemsTax + additionalTax) * 100) / 100;
  const totalAmount = Math.round((taxableBase + totalTax) * 100) / 100;

  return {
    subtotal,
    discountAmount: totalDiscount,
    taxAmount: totalTax,
    totalAmount,
  };
}

/**
 * Enforces strict order status lifecycle state transitions
 */
export function canTransitionOrderStatus(
  current: SalesOrderStatus,
  target: SalesOrderStatus
): { allowed: boolean; reason?: string; requiresStockDeduction?: boolean; requiresStockRestoration?: boolean } {
  if (current === target) {
    return { allowed: false, reason: `Order is already in "${current}" status.` };
  }

  if (current === 'cancelled') {
    return {
      allowed: false,
      reason: 'Cancelled orders cannot be reopened or transitioned. Create a new sales order instead.',
    };
  }

  switch (current) {
    case 'draft':
      if (target === 'confirmed') {
        return { allowed: true, requiresStockDeduction: true };
      }
      if (target === 'completed' || (target as any) === 'fulfilled') {
        return { allowed: true, requiresStockDeduction: true };
      }
      if (target === 'cancelled') {
        return { allowed: true, requiresStockDeduction: false };
      }
      return { allowed: false, reason: `Invalid transition from ${current} to ${target}.` };

    case 'confirmed':
      if (target === 'completed' || (target as any) === 'fulfilled') {
        // Stock already deducted upon confirmation, no duplicate deduction
        return { allowed: true, requiresStockDeduction: false };
      }
      if (target === 'cancelled') {
        // Stock must be restored upon cancellation
        return { allowed: true, requiresStockRestoration: true };
      }
      return { allowed: false, reason: `Cannot revert confirmed order back to ${target}.` };

    case 'completed':
    case 'fulfilled':
      if (target === 'cancelled') {
        // Compensating stock restoration
        return { allowed: true, requiresStockRestoration: true };
      }
      return { allowed: false, reason: `Completed orders cannot transition to ${target}.` };

    default:
      return { allowed: false, reason: `Unknown order status: ${current}` };
  }
}

/**
 * Calculates payment settlement state for an invoice
 */
export function calculateInvoicePaymentState(
  invoice: Invoice,
  payments: Payment[] = []
): InvoicePaymentSummary {
  const total = Math.max(0, Number(invoice.total_amount) || 0);

  // Filter valid payments linked to this invoice that are not reversed
  const linkedPayments = payments.filter(
    (p) => p.invoice_id === invoice.id && p.status !== 'reversed'
  );

  const paymentsSum = linkedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  // Also account for direct amount_paid field if payments table is empty
  const amountPaid = Math.round(Math.max(paymentsSum, Number(invoice.amount_paid) || 0) * 100) / 100;
  const outstandingBalance = Math.max(0, Math.round((total - amountPaid) * 100) / 100);

  let paymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
  if (amountPaid >= total && total > 0) {
    paymentStatus = 'paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'partially_paid';
  }

  const isPaid = paymentStatus === 'paid';
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  const now = new Date();
  const isOverdue =
    !isPaid &&
    invoice.status !== 'voided' &&
    dueDate !== null &&
    dueDate.getTime() < now.getTime();

  return {
    totalAmount: total,
    amountPaid,
    outstandingBalance,
    paymentStatus,
    isPaid,
    isOverdue,
    validPaymentsCount: linkedPayments.length,
  };
}

export interface SalesMetricsOptions {
  startDate?: string;
  endDate?: string;
}

/**
 * Calculates live Sales Dashboard overview metrics
 */
export function calculateSalesDashboardMetrics(
  orders: SalesOrder[],
  invoices: Invoice[],
  dateRangeOrPaymentsOrOpts: DateRangeKey | Payment[] | SalesMetricsOptions = '30d',
  referenceDateOrOpts: Date | SalesMetricsOptions = new Date()
): SalesDashboardMetrics {
  let startMs = 0;
  let endMs = Infinity;

  if (typeof dateRangeOrPaymentsOrOpts === 'string') {
    const refDate = referenceDateOrOpts instanceof Date ? referenceDateOrOpts : new Date();
    const bounds = getDateRangeBounds(dateRangeOrPaymentsOrOpts, refDate);
    startMs = bounds.start.getTime();
    endMs = bounds.end.getTime();
  } else if (
    typeof dateRangeOrPaymentsOrOpts === 'object' &&
    !Array.isArray(dateRangeOrPaymentsOrOpts)
  ) {
    const opts = dateRangeOrPaymentsOrOpts as SalesMetricsOptions;
    if (opts.startDate) startMs = new Date(opts.startDate).getTime();
    if (opts.endDate) {
      const e = new Date(opts.endDate);
      e.setHours(23, 59, 59, 999);
      endMs = e.getTime();
    }
  } else if (
    typeof referenceDateOrOpts === 'object' &&
    !(referenceDateOrOpts instanceof Date)
  ) {
    const opts = referenceDateOrOpts as SalesMetricsOptions;
    if (opts.startDate) startMs = new Date(opts.startDate).getTime();
    if (opts.endDate) {
      const e = new Date(opts.endDate);
      e.setHours(23, 59, 59, 999);
      endMs = e.getTime();
    }
  }

  let totalSales = 0;
  let ordersCount = 0;
  let completedOrdersCount = 0;
  let confirmedOrdersCount = 0;
  let pendingOrdersCount = 0;
  let draftOrdersCount = 0;
  let cancelledOrdersCount = 0;

  for (const o of orders) {
    const orderTime = new Date(o.order_date || o.created_at).getTime();
    if (orderTime >= startMs && orderTime <= endMs) {
      if (o.status === 'confirmed' || o.status === 'completed' || (o.status as any) === 'fulfilled') {
        totalSales += Number(o.total_amount) || 0;
        ordersCount++;
        if (o.status === 'completed' || (o.status as any) === 'fulfilled') {
          completedOrdersCount++;
        } else {
          confirmedOrdersCount++;
          pendingOrdersCount++;
        }
      } else if (o.status === 'draft') {
        ordersCount++;
        draftOrdersCount++;
        pendingOrdersCount++;
      } else if (o.status === 'cancelled') {
        cancelledOrdersCount++;
      }
    }
  }

  let totalInvoiced = 0;
  let paidAmount = 0;
  let outstandingInvoiceBalance = 0;
  let openInvoicesCount = 0;
  let paidInvoicesCount = 0;
  let pendingInvoicesCount = 0;

  for (const inv of invoices) {
    const invTime = new Date(inv.issue_date || inv.created_at).getTime();
    if (invTime >= startMs && invTime <= endMs) {
      const invTotal = Number(inv.total_amount) || 0;
      const invPaid = Number(inv.amount_paid) || 0;
      totalInvoiced += invTotal;
      paidAmount += invPaid;

      if (inv.status !== 'voided') {
        const balance = Math.max(0, invTotal - invPaid);
        if (balance > 0) {
          outstandingInvoiceBalance += balance;
          openInvoicesCount++;
          pendingInvoicesCount++;
        } else if (invTotal > 0) {
          paidInvoicesCount++;
        }
      }
    }
  }

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    ordersCount,
    totalOrdersCount: ordersCount,
    completedOrdersCount,
    confirmedOrdersCount,
    draftOrdersCount,
    pendingOrdersCount,
    cancelledOrdersCount,
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    paidAmount: Math.round(paidAmount * 100) / 100,
    totalCollectedRevenue: Math.round(paidAmount * 100) / 100,
    outstandingInvoiceBalance: Math.round(outstandingInvoiceBalance * 100) / 100,
    openInvoicesCount,
    pendingInvoicesCount,
    paidInvoicesCount,
  };
}

export interface OrderFilterOptions {
  search?: string;
  status?: string;
  customerMap?: Map<string, Customer | string>;
  startDate?: string;
  endDate?: string;
  sortBy?: 'order_date' | 'total_amount' | 'order_number';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Filter and sort sales orders. Supports both positional parameters and options object.
 */
export function filterAndSortOrders(
  orders: SalesOrder[],
  searchOrOptions: string | OrderFilterOptions = '',
  statusFilter = 'all',
  customerMapInput?: Map<string, string>
): SalesOrder[] {
  let q = '';
  let status = 'all';
  let customerMap: Map<string, any> = customerMapInput || new Map();
  let startDate: string | undefined;
  let endDate: string | undefined;
  let sortBy: 'order_date' | 'total_amount' | 'order_number' = 'order_date';
  let sortDirection: 'asc' | 'desc' = 'desc';

  if (typeof searchOrOptions === 'object' && searchOrOptions !== null) {
    q = (searchOrOptions.search || '').toLowerCase().trim();
    status = searchOrOptions.status || 'all';
    if (searchOrOptions.customerMap) customerMap = searchOrOptions.customerMap;
    startDate = searchOrOptions.startDate;
    endDate = searchOrOptions.endDate;
    if (searchOrOptions.sortBy) sortBy = searchOrOptions.sortBy;
    if (searchOrOptions.sortDirection) sortDirection = searchOrOptions.sortDirection;
  } else {
    q = (searchOrOptions || '').toLowerCase().trim();
    status = statusFilter;
  }

  return orders
    .filter((o) => {
      // Status filter
      if (status !== 'all' && o.status !== status) {
        return false;
      }

      // Date range filter
      if (startDate) {
        const orderDateStr = (o.order_date || o.created_at).slice(0, 10);
        if (orderDateStr < startDate) return false;
      }
      if (endDate) {
        const orderDateStr = (o.order_date || o.created_at).slice(0, 10);
        if (orderDateStr > endDate) return false;
      }

      // Search query
      if (q) {
        const custEntry = customerMap.get(o.customer_id);
        const custName = (
          typeof custEntry === 'object'
            ? custEntry?.name || custEntry?.company_name
            : custEntry || o.customer?.name || ''
        ).toLowerCase();

        const numMatch = (o.order_number || '').toLowerCase().includes(q);
        const notesMatch = (o.notes || '').toLowerCase().includes(q);
        const custMatch = custName.includes(q);
        return numMatch || custMatch || notesMatch;
      }

      return true;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'total_amount') {
        comp = (a.total_amount || 0) - (b.total_amount || 0);
      } else if (sortBy === 'order_number') {
        comp = a.order_number.localeCompare(b.order_number);
      } else {
        const timeA = new Date(a.order_date || a.created_at).getTime();
        const timeB = new Date(b.order_date || b.created_at).getTime();
        comp = timeA - timeB;
      }
      return sortDirection === 'desc' ? -comp : comp;
    });
}

export interface InvoiceFilterOptions {
  search?: string;
  status?: string;
  customerMap?: Map<string, Customer | string>;
  sortBy?: 'issue_date' | 'due_date' | 'total_amount' | 'invoice_number';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Filter and sort invoices. Supports both positional parameters and options object.
 */
export function filterAndSortInvoices(
  invoices: Invoice[],
  searchOrOptions: string | InvoiceFilterOptions = '',
  statusFilter = 'all',
  customerMapInput?: Map<string, string>
): Invoice[] {
  let q = '';
  let status = 'all';
  let customerMap: Map<string, any> = customerMapInput || new Map();
  let sortBy: 'issue_date' | 'due_date' | 'total_amount' | 'invoice_number' = 'issue_date';
  let sortDirection: 'asc' | 'desc' = 'desc';

  if (typeof searchOrOptions === 'object' && searchOrOptions !== null) {
    q = (searchOrOptions.search || '').toLowerCase().trim();
    status = searchOrOptions.status || 'all';
    if (searchOrOptions.customerMap) customerMap = searchOrOptions.customerMap;
    if (searchOrOptions.sortBy) sortBy = searchOrOptions.sortBy;
    if (searchOrOptions.sortDirection) sortDirection = searchOrOptions.sortDirection;
  } else {
    q = (searchOrOptions || '').toLowerCase().trim();
    status = statusFilter;
  }

  return invoices
    .filter((inv) => {
      if (status !== 'all' && inv.status !== status) {
        return false;
      }

      if (q) {
        const custEntry = customerMap.get(inv.customer_id);
        const custName = (
          typeof custEntry === 'object'
            ? custEntry?.name || custEntry?.company_name
            : custEntry || inv.customer?.name || ''
        ).toLowerCase();

        const numMatch = (inv.invoice_number || '').toLowerCase().includes(q);
        const notesMatch = (inv.notes || '').toLowerCase().includes(q);
        const custMatch = custName.includes(q);
        return numMatch || custMatch || notesMatch;
      }

      return true;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'total_amount') {
        comp = (a.total_amount || 0) - (b.total_amount || 0);
      } else if (sortBy === 'invoice_number') {
        comp = a.invoice_number.localeCompare(b.invoice_number);
      } else if (sortBy === 'due_date') {
        const timeA = new Date(a.due_date || a.created_at).getTime();
        const timeB = new Date(b.due_date || b.created_at).getTime();
        comp = timeA - timeB;
      } else {
        const timeA = new Date(a.issue_date || a.created_at).getTime();
        const timeB = new Date(b.issue_date || b.created_at).getTime();
        comp = timeA - timeB;
      }
      return sortDirection === 'desc' ? -comp : comp;
    });
}
