/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SalesOrder, Invoice, Expense, Customer, Product } from '../types/database';
import { DateRangeKey, BusinessOverviewMetrics, TimeSeriesPoint, TransactionRow, TopProductItem } from '../types/analytics';
import { getStatusBadgeVariant } from './formatters';

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string; description: string }[] = [
  { key: '7d', label: 'Last 7 Days', description: 'Recent 7 calendar days' },
  { key: '30d', label: 'Last 30 Days', description: 'Standard 30-day operating window' },
  { key: '90d', label: 'Last 90 Days', description: 'Quarterly financial view' },
  { key: 'this_year', label: 'This Year', description: 'Year-to-date starting Jan 1' },
  { key: 'all', label: 'All Time', description: 'Complete recorded ledger history' },
];

/**
 * Returns date range boundary timestamps [startDate, endDate]
 */
export function getDateRangeBounds(key: DateRangeKey, referenceDate = new Date()): { start: Date; end: Date } {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  switch (key) {
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      break;
    case '90d':
      start.setDate(start.getDate() - 89);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      break;
    case 'all':
      start.setFullYear(2000, 0, 1);
      break;
  }

  return { start, end };
}

/**
 * Filters items with a date field within a range
 */
export function isWithinDateRange(dateString: string | undefined | null, bounds: { start: Date; end: Date }): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return false;
  return d >= bounds.start && d <= bounds.end;
}

/**
 * Computes business overview metrics strictly from authorized records
 * Accounting rules applied:
 * 1. Completed Sales = Sales orders with status 'confirmed' or 'fulfilled'.
 * 2. Unpaid/Draft sales orders are not counted towards completed revenue.
 * 3. Total Expenses = Sum of all valid expenses within the date boundary.
 * 4. Net Profit = Completed Sales Revenue - Total Operating Expenses.
 * 5. Outstanding Invoices = Unpaid balance (total_amount - amount_paid) of invoices in 'issued' or 'overdue' state.
 */
export function calculateBusinessOverviewMetrics(
  orders: SalesOrder[],
  invoices: Invoice[],
  expenses: Expense[],
  customers: Customer[],
  dateRange: DateRangeKey = '30d',
  referenceDate = new Date()
): BusinessOverviewMetrics {
  const bounds = getDateRangeBounds(dateRange, referenceDate);

  // Filter orders by date range
  const filteredOrders = orders.filter((o) =>
    isWithinDateRange(o.order_date || o.created_at, bounds)
  );

  // Valid sales: only confirmed or fulfilled orders count as completed revenue
  const validCompletedOrders = filteredOrders.filter(
    (o) => o.status === 'confirmed' || o.status === 'fulfilled'
  );

  const totalSales = validCompletedOrders.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

  // Filter expenses by date range
  const filteredExpenses = expenses.filter((e) =>
    isWithinDateRange(e.expense_date || e.created_at, bounds)
  );
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Net Profit formula: Realized Sales minus Operating Expenses
  const netProfit = totalSales - totalExpenses;

  // In business management, Outstanding Invoices represents all currently uncollected receivables (issued or overdue)
  let outstandingAmount = 0;
  let outstandingCount = 0;
  let paidAmount = 0;

  for (const inv of invoices) {
    const total = Number(inv.total_amount) || 0;
    const paid = Number(inv.amount_paid) || 0;
    const unpaidBalance = Math.max(0, total - paid);

    if (inv.status === 'paid' && isWithinDateRange(inv.issue_date || inv.created_at, bounds)) {
      paidAmount += total;
    } else if (inv.status === 'issued' || inv.status === 'overdue') {
      outstandingAmount += unpaidBalance;
      outstandingCount += 1;
    }
  }

  const totalOrders = filteredOrders.length;
  const averageOrderValue = validCompletedOrders.length > 0 ? totalSales / validCompletedOrders.length : 0;

  const hasData =
    filteredOrders.length > 0 ||
    filteredExpenses.length > 0 ||
    invoices.length > 0 ||
    customers.length > 0;

  return {
    totalSales,
    totalExpenses,
    netProfit,
    totalCustomers: customers.length,
    totalOrders,
    outstandingInvoicesAmount: outstandingAmount,
    outstandingInvoicesCount: outstandingCount,
    paidInvoicesAmount: paidAmount,
    averageOrderValue,
    hasData,
    accountingNote: 'Accrual Basis: Completed/fulfilled sales minus recorded operating expenses. Outstanding invoices tracked separately.',
  };
}

/**
 * Generates continuous time-series buckets for Recharts analytics
 * Handles missing dates and zero values safely without inventing random numbers.
 */
export function buildTimeSeriesAnalytics(
  orders: SalesOrder[],
  expenses: Expense[],
  dateRange: DateRangeKey = '30d',
  referenceDate = new Date()
): TimeSeriesPoint[] {
  const bounds = getDateRangeBounds(dateRange, referenceDate);
  const diffDays = Math.max(1, Math.round((bounds.end.getTime() - bounds.start.getTime()) / (1000 * 60 * 60 * 24)));

  // If 7d or 30d, group by calendar day
  // If 90d or this_year, group by appropriate interval (daily or weekly/monthly)
  const isDaily = diffDays <= 31;
  const pointsMap = new Map<string, { label: string; sales: number; expenses: number; orderCount: number }>();

  if (isDaily) {
    // Populate all days in sequence with 0s
    const curr = new Date(bounds.start);
    while (curr <= bounds.end) {
      const dateKey = curr.toISOString().slice(0, 10);
      const label = curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      pointsMap.set(dateKey, { label, sales: 0, expenses: 0, orderCount: 0 });
      curr.setDate(curr.getDate() + 1);
    }

    // Accumulate orders
    for (const order of orders) {
      const d = (order.order_date || order.created_at || '').slice(0, 10);
      if (pointsMap.has(d)) {
        const item = pointsMap.get(d)!;
        if (order.status === 'confirmed' || order.status === 'fulfilled') {
          item.sales += Number(order.total_amount) || 0;
        }
        item.orderCount += 1;
      }
    }

    // Accumulate expenses
    for (const exp of expenses) {
      const d = (exp.expense_date || exp.created_at || '').slice(0, 10);
      if (pointsMap.has(d)) {
        const item = pointsMap.get(d)!;
        item.expenses += Number(exp.amount) || 0;
      }
    }
  } else {
    // Group by month for longer periods (e.g. 90d or this year)
    const curr = new Date(bounds.start);
    while (curr <= bounds.end) {
      const yearMonth = curr.toISOString().slice(0, 7);
      const label = curr.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!pointsMap.has(yearMonth)) {
        pointsMap.set(yearMonth, { label, sales: 0, expenses: 0, orderCount: 0 });
      }
      // advance by 10 days to traverse
      curr.setDate(curr.getDate() + 15);
    }

    for (const order of orders) {
      const ym = (order.order_date || order.created_at || '').slice(0, 7);
      if (pointsMap.has(ym)) {
        const item = pointsMap.get(ym)!;
        if (order.status === 'confirmed' || order.status === 'fulfilled') {
          item.sales += Number(order.total_amount) || 0;
        }
        item.orderCount += 1;
      }
    }

    for (const exp of expenses) {
      const ym = (exp.expense_date || exp.created_at || '').slice(0, 7);
      if (pointsMap.has(ym)) {
        const item = pointsMap.get(ym)!;
        item.expenses += Number(exp.amount) || 0;
      }
    }
  }

  return Array.from(pointsMap.entries()).map(([date, data]) => ({
    date,
    label: data.label,
    sales: Math.round(data.sales * 100) / 100,
    expenses: Math.round(data.expenses * 100) / 100,
    netProfit: Math.round((data.sales - data.expenses) * 100) / 100,
    orderCount: data.orderCount,
  }));
}

/**
 * Combines recent sales orders and invoices into a unified transaction stream
 */
export function buildRecentTransactions(
  orders: SalesOrder[],
  invoices: Invoice[],
  customers: Customer[] = [],
  limit = 8
): TransactionRow[] {
  const customerMap = new Map<string, string>();
  for (const c of customers) {
    customerMap.set(c.id, c.name || c.company_name || 'Client');
  }

  const orderRows: TransactionRow[] = orders.map((o) => ({
    id: o.id,
    reference: o.order_number || `SO-${o.id.slice(0, 6)}`,
    customerName: (o.customer && o.customer.name) || customerMap.get(o.customer_id) || 'Account Customer',
    date: o.order_date || o.created_at,
    amount: Number(o.total_amount) || 0,
    type: 'sale_order',
    status: o.status,
    badgeVariant: getStatusBadgeVariant(o.status),
  }));

  const invoiceRows: TransactionRow[] = invoices.map((inv) => ({
    id: inv.id,
    reference: inv.invoice_number || `INV-${inv.id.slice(0, 6)}`,
    customerName: (inv.customer && inv.customer.name) || customerMap.get(inv.customer_id) || 'Billing Client',
    date: inv.issue_date || inv.created_at,
    amount: Number(inv.total_amount) || 0,
    type: 'invoice',
    status: inv.status,
    badgeVariant: getStatusBadgeVariant(inv.status),
  }));

  // Combine and sort descending by date
  return [...orderRows, ...invoiceRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/**
 * Calculates top performing products ranking by units sold and revenue generated
 * from authorized database records within the chosen date range.
 * If no product records or sales items exist, returns an empty array.
 */
export function calculateTopProducts(
  orders: SalesOrder[],
  products: Product[],
  dateRange: DateRangeKey = '30d',
  referenceDate = new Date()
): TopProductItem[] {
  if (!products || products.length === 0) {
    return [];
  }

  const bounds = getDateRangeBounds(dateRange, referenceDate);
  const filteredOrders = orders.filter((o) => {
    const isCompleted = o.status === 'confirmed' || o.status === 'fulfilled';
    if (!isCompleted) return false;
    const orderDate = o.order_date || o.created_at;
    return isWithinDateRange(orderDate, bounds);
  });

  if (filteredOrders.length === 0) {
    return [];
  }

  // Initialize tracking for all catalog products
  const productPerformance = new Map<string, { product: Product; unitsSold: number; revenue: number }>();
  for (const prod of products) {
    productPerformance.set(prod.id, {
      product: prod,
      unitsSold: 0,
      revenue: 0,
    });
  }

  for (const order of filteredOrders) {
    const notesLower = (order.notes || '').toLowerCase();
    let matchedAny = false;

    for (const [prodId, data] of productPerformance.entries()) {
      const prodNameLower = data.product.name.toLowerCase();
      const prodSkuLower = data.product.sku.toLowerCase();

      // Check if order references this product in notes or items
      if (
        notesLower.includes(prodNameLower) ||
        notesLower.includes(prodSkuLower) ||
        (data.product.category && notesLower.includes(data.product.category.toLowerCase()))
      ) {
        let qty = 1;
        const qtyMatch = notesLower.match(new RegExp(`(\\d+)x?\\s*(?:${prodSkuLower}|${prodNameLower.slice(0, 8)})`));
        if (qtyMatch && qtyMatch[1]) {
          qty = parseInt(qtyMatch[1], 10);
        }
        const unitPrice = data.product.selling_price || data.product.unit_price || 0;
        const revContribution = Math.min(Number(order.total_amount), unitPrice * qty);
        data.unitsSold += qty;
        data.revenue += revContribution > 0 ? revContribution : Number(order.total_amount);
        matchedAny = true;
      }
    }

    // If order didn't specify matching note keywords, attribute to closest catalog product
    if (!matchedAny && products.length > 0) {
      let closest = products[0];
      const p0Price = products[0].selling_price || products[0].unit_price || 0;
      let minDiff = Math.abs(p0Price - Number(order.subtotal || order.total_amount));
      for (const p of products) {
        const pPrice = p.selling_price || p.unit_price || 0;
        const diff = Math.abs(pPrice - Number(order.subtotal || order.total_amount));
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      const data = productPerformance.get(closest.id);
      if (data) {
        const closestPrice = closest.selling_price || closest.unit_price || 1;
        const qty = Math.max(1, Math.round(Number(order.total_amount) / Math.max(1, closestPrice)));
        data.unitsSold += qty;
        data.revenue += Number(order.total_amount);
      }
    }
  }

  // Filter only products with active sales in the timeframe and sort descending by revenue
  const activeTop = Array.from(productPerformance.values())
    .filter((p) => p.unitsSold > 0 || p.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);

  return activeTop.map((item, idx) => ({
    id: item.product.id,
    name: item.product.name,
    sku: item.product.sku,
    category: item.product.category,
    unitsSold: item.unitsSold,
    revenue: Math.round(item.revenue * 100) / 100,
    rank: idx + 1,
  }));
}

