/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SalesOrder,
  SalesOrderItem,
  Invoice,
  Payment,
  Expense,
  ExpensePayment,
  Product,
  Customer,
} from '../types/database';
import { calculateInvoicePaymentState } from './sales';
import { calculateExpensePaymentState, resolveCategoryMetadata } from './expenses';

export type ReportDatePreset =
  | 'today'
  | '7d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'
  | 'all';

export interface DateRangeResult {
  startDate?: string;
  endDate?: string;
  label: string;
}

/**
 * Computes precise YYYY-MM-DD boundaries for reporting presets
 */
export function getReportDateRangeBounds(
  preset: ReportDatePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate = new Date()
): DateRangeResult {
  const ref = new Date(referenceDate);
  const todayStr = ref.toISOString().slice(0, 10);

  if (preset === 'all') {
    return { startDate: undefined, endDate: undefined, label: 'All Time' };
  }

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr, label: 'Today' };
  }

  if (preset === '7d') {
    const d = new Date(ref);
    d.setDate(d.getDate() - 7);
    return { startDate: d.toISOString().slice(0, 10), endDate: todayStr, label: 'Last 7 Days' };
  }

  if (preset === '30d') {
    const d = new Date(ref);
    d.setDate(d.getDate() - 30);
    return { startDate: d.toISOString().slice(0, 10), endDate: todayStr, label: 'Last 30 Days' };
  }

  if (preset === '90d') {
    const d = new Date(ref);
    d.setDate(d.getDate() - 90);
    return { startDate: d.toISOString().slice(0, 10), endDate: todayStr, label: 'Last 90 Days' };
  }

  if (preset === 'this_month') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    return { startDate: start.toISOString().slice(0, 10), endDate: todayStr, label: 'This Month' };
  }

  if (preset === 'last_month') {
    const start = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const end = new Date(ref.getFullYear(), ref.getMonth(), 0);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      label: 'Previous Month',
    };
  }

  if (preset === 'this_year') {
    const start = new Date(ref.getFullYear(), 0, 1);
    return { startDate: start.toISOString().slice(0, 10), endDate: todayStr, label: 'This Year' };
  }

  if (preset === 'custom') {
    return {
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
      label: customStart && customEnd ? `${customStart} to ${customEnd}` : 'Custom Range',
    };
  }

  return { startDate: undefined, endDate: undefined, label: 'Selected Period' };
}

export function isDateWithinRange(
  dateStr?: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!dateStr) return true;
  const d = dateStr.slice(0, 10);
  if (startDate && d < startDate) return false;
  if (endDate && d > endDate) return false;
  return true;
}

// =========================================================================
// 1. FINANCIAL PROFITABILITY REPORT
// =========================================================================

export interface MonthlyFinancialTrend {
  month: string; // YYYY-MM
  label: string; // e.g., "Jun 2026"
  revenue: number;
  cashCollected: number;
  expenses: number;
  cashPaidOut: number;
  grossProfit: number;
  netProfit: number;
}

export interface FinancialOverviewSummary {
  realizedOrderRevenue: number;
  invoicedRevenue: number;
  cashCollectedRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalOperatingExpenses: number;
  cashPaidExpenses: number;
  unpaidExpenseObligations: number;
  estimatedNetProfit: number;
  netProfitMargin: number;
  accountsReceivableOutstanding: number;
  accountsPayableOutstanding: number;
  netWorkingCapitalBalance: number;
  monthlyTrends: MonthlyFinancialTrend[];
}

export function calculateFinancialReport(params: {
  orders: SalesOrder[];
  orderItems: SalesOrderItem[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  expensePayments?: ExpensePayment[];
  products?: Product[];
  startDate?: string;
  endDate?: string;
}): FinancialOverviewSummary {
  const {
    orders,
    orderItems,
    invoices,
    payments,
    expenses,
    expensePayments = [],
    products = [],
    startDate,
    endDate,
  } = params;

  const validOrders = orders.filter(
    (o) =>
      (o.status === 'confirmed' || o.status === 'completed' || (o.status as any) === 'fulfilled') &&
      isDateWithinRange(o.order_date || o.created_at, startDate, endDate)
  );
  const realizedOrderRevenue = validOrders.reduce(
    (acc, o) => acc + (Number(o.total_amount) || 0),
    0
  );

  const validOrderIds = new Set(validOrders.map((o) => o.id));
  const productCostMap = new Map<string, number>();
  products.forEach((p) => productCostMap.set(p.id, Number(p.cost_price) || 0));

  let costOfGoodsSold = 0;
  for (const item of orderItems) {
    if (validOrderIds.has(item.order_id)) {
      const unitCost = productCostMap.get(item.product_id) || 0;
      costOfGoodsSold += (Number(item.quantity) || 0) * unitCost;
    }
  }

  let invoicedRevenue = 0;
  let cashCollectedRevenue = 0;
  let accountsReceivableOutstanding = 0;

  for (const inv of invoices) {
    if (inv.status === 'voided' || inv.status === 'draft') continue;
    const pState = calculateInvoicePaymentState(inv, payments);

    if (isDateWithinRange(inv.issue_date || inv.created_at, startDate, endDate)) {
      invoicedRevenue += inv.total_amount;
      cashCollectedRevenue += pState.amountPaid;
    }
    accountsReceivableOutstanding += pState.outstandingBalance;
  }

  let totalOperatingExpenses = 0;
  let cashPaidExpenses = 0;
  let accountsPayableOutstanding = 0;

  const activeExpenses = expenses.filter((e) => !e.is_archived);
  for (const exp of activeExpenses) {
    const eState = calculateExpensePaymentState(exp, expensePayments);

    if (isDateWithinRange(exp.expense_date || exp.created_at, startDate, endDate)) {
      totalOperatingExpenses += eState.totalAmount;
      cashPaidExpenses += eState.amountPaid;
    }
    accountsPayableOutstanding += eState.outstandingBalance;
  }

  const grossProfit = Math.round((realizedOrderRevenue - costOfGoodsSold) * 100) / 100;
  const grossProfitMargin =
    realizedOrderRevenue > 0
      ? Math.round((grossProfit / realizedOrderRevenue) * 1000) / 10
      : 0;

  const estimatedNetProfit =
    Math.round((grossProfit - totalOperatingExpenses) * 100) / 100;
  const netProfitMargin =
    realizedOrderRevenue > 0
      ? Math.round((estimatedNetProfit / realizedOrderRevenue) * 1000) / 10
      : 0;

  const netWorkingCapitalBalance =
    Math.round((accountsReceivableOutstanding - accountsPayableOutstanding) * 100) / 100;

  const monthlyBuckets = new Map<
    string,
    { revenue: number; cashCollected: number; expenses: number; cashPaidOut: number }
  >();

  const getBucket = (monthKey: string) => {
    let b = monthlyBuckets.get(monthKey);
    if (!b) {
      b = { revenue: 0, cashCollected: 0, expenses: 0, cashPaidOut: 0 };
      monthlyBuckets.set(monthKey, b);
    }
    return b;
  };

  for (const o of validOrders) {
    const monthKey = (o.order_date || o.created_at).slice(0, 7);
    const b = getBucket(monthKey);
    b.revenue += Number(o.total_amount) || 0;
  }

  for (const p of payments) {
    if (p.status !== 'reversed') {
      const monthKey = (p.payment_date || p.created_at).slice(0, 7);
      const b = getBucket(monthKey);
      b.cashCollected += Number(p.amount) || 0;
    }
  }

  for (const exp of activeExpenses) {
    const eState = calculateExpensePaymentState(exp, expensePayments);
    const monthKey = (exp.expense_date || exp.created_at).slice(0, 7);
    const b = getBucket(monthKey);
    b.expenses += eState.totalAmount;
    b.cashPaidOut += eState.amountPaid;
  }

  const sortedMonths = Array.from(monthlyBuckets.keys()).sort();
  const monthlyTrends: MonthlyFinancialTrend[] = sortedMonths.map((m) => {
    const data = monthlyBuckets.get(m)!;
    const [year, monthNum] = m.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const net = Math.round((data.revenue - data.expenses) * 100) / 100;

    return {
      month: m,
      label,
      revenue: Math.round(data.revenue * 100) / 100,
      cashCollected: Math.round(data.cashCollected * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
      cashPaidOut: Math.round(data.cashPaidOut * 100) / 100,
      grossProfit: Math.round(data.revenue * 100) / 100,
      netProfit: net,
    };
  });

  return {
    realizedOrderRevenue: Math.round(realizedOrderRevenue * 100) / 100,
    invoicedRevenue: Math.round(invoicedRevenue * 100) / 100,
    cashCollectedRevenue: Math.round(cashCollectedRevenue * 100) / 100,
    costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
    grossProfit,
    grossProfitMargin,
    totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
    cashPaidExpenses: Math.round(cashPaidExpenses * 100) / 100,
    unpaidExpenseObligations: Math.round(accountsPayableOutstanding * 100) / 100,
    estimatedNetProfit,
    netProfitMargin,
    accountsReceivableOutstanding: Math.round(accountsReceivableOutstanding * 100) / 100,
    accountsPayableOutstanding: Math.round(accountsPayableOutstanding * 100) / 100,
    netWorkingCapitalBalance,
    monthlyTrends,
  };
}

// =========================================================================
// 2. SALES REPORT
// =========================================================================

export interface ProductSalesRanking {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  percentage: number;
}

export interface CustomerSalesRanking {
  customerId: string;
  name: string;
  ordersCount: number;
  totalSpent: number;
  percentage: number;
}

export interface SalesReportSummary {
  totalSales: number;
  completedOrdersCount: number;
  totalOrdersCount: number;
  averageOrderValue: number;
  salesTimeline: Array<{ date: string; label: string; sales: number; ordersCount: number }>;
  topProducts: ProductSalesRanking[];
  topCustomers: CustomerSalesRanking[];
  orderStatusCounts: Array<{ status: string; count: number; amount: number; percentage: number }>;
  paymentStatusCounts: Array<{ status: string; count: number; amount: number; percentage: number }>;
}

export function calculateSalesReport(params: {
  orders: SalesOrder[];
  orderItems: SalesOrderItem[];
  customers: Customer[];
  startDate?: string;
  endDate?: string;
}): SalesReportSummary {
  const { orders, orderItems, customers, startDate, endDate } = params;

  const filteredOrders = orders.filter((o) =>
    isDateWithinRange(o.order_date || o.created_at, startDate, endDate)
  );

  const completedOrders = filteredOrders.filter(
    (o) => o.status === 'confirmed' || o.status === 'completed' || (o.status as any) === 'fulfilled'
  );

  const totalSales = completedOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  const averageOrderValue =
    completedOrders.length > 0 ? Math.round((totalSales / completedOrders.length) * 100) / 100 : 0;

  // Timeline aggregation (by day)
  const dayMap = new Map<string, { sales: number; ordersCount: number }>();
  for (const o of completedOrders) {
    const day = (o.order_date || o.created_at).slice(0, 10);
    const existing = dayMap.get(day) || { sales: 0, ordersCount: 0 };
    existing.sales += Number(o.total_amount) || 0;
    existing.ordersCount += 1;
    dayMap.set(day, existing);
  }

  const sortedDays = Array.from(dayMap.keys()).sort();
  const salesTimeline = sortedDays.map((d) => {
    const val = dayMap.get(d)!;
    const [, month, dayNum] = d.split('-');
    return {
      date: d,
      label: `${month}/${dayNum}`,
      sales: Math.round(val.sales * 100) / 100,
      ordersCount: val.ordersCount,
    };
  });

  // Top products from order items belonging to completed orders
  const completedOrderIds = new Set(completedOrders.map((o) => o.id));
  const productSalesMap = new Map<
    string,
    { name: string; sku: string; unitsSold: number; revenue: number }
  >();

  for (const item of orderItems) {
    if (completedOrderIds.has(item.order_id)) {
      const prodId = item.product_id;
      const existing = productSalesMap.get(prodId) || {
        name: item.product_name_snapshot,
        sku: item.sku_snapshot,
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += Number(item.quantity) || 0;
      existing.revenue += Number(item.line_total) || 0;
      productSalesMap.set(prodId, existing);
    }
  }

  const topProducts: ProductSalesRanking[] = Array.from(productSalesMap.entries())
    .map(([productId, val]) => ({
      productId,
      name: val.name,
      sku: val.sku,
      unitsSold: val.unitsSold,
      revenue: Math.round(val.revenue * 100) / 100,
      percentage: totalSales > 0 ? Math.round((val.revenue / totalSales) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top customers
  const customerLookup = new Map<string, string>();
  customers.forEach((c) => customerLookup.set(c.id, c.company_name || c.name));

  const custSalesMap = new Map<string, { ordersCount: number; totalSpent: number }>();
  for (const o of completedOrders) {
    const existing = custSalesMap.get(o.customer_id) || { ordersCount: 0, totalSpent: 0 };
    existing.ordersCount += 1;
    existing.totalSpent += Number(o.total_amount) || 0;
    custSalesMap.set(o.customer_id, existing);
  }

  const topCustomers: CustomerSalesRanking[] = Array.from(custSalesMap.entries())
    .map(([customerId, val]) => ({
      customerId,
      name: customerLookup.get(customerId) || 'Client Account',
      ordersCount: val.ordersCount,
      totalSpent: Math.round(val.totalSpent * 100) / 100,
      percentage: totalSales > 0 ? Math.round((val.totalSpent / totalSales) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Order status distribution
  const orderStatusMap = new Map<string, { count: number; amount: number }>();
  for (const o of filteredOrders) {
    const st = o.status || 'draft';
    const ex = orderStatusMap.get(st) || { count: 0, amount: 0 };
    ex.count += 1;
    ex.amount += Number(o.total_amount) || 0;
    orderStatusMap.set(st, ex);
  }

  const orderStatusCounts = Array.from(orderStatusMap.entries()).map(([status, val]) => ({
    status,
    count: val.count,
    amount: Math.round(val.amount * 100) / 100,
    percentage:
      filteredOrders.length > 0 ? Math.round((val.count / filteredOrders.length) * 1000) / 10 : 0,
  }));

  // Payment status distribution
  const payStatusMap = new Map<string, { count: number; amount: number }>();
  for (const o of completedOrders) {
    const pst = o.payment_status || 'unpaid';
    const ex = payStatusMap.get(pst) || { count: 0, amount: 0 };
    ex.count += 1;
    ex.amount += Number(o.total_amount) || 0;
    payStatusMap.set(pst, ex);
  }

  const paymentStatusCounts = Array.from(payStatusMap.entries()).map(([status, val]) => ({
    status,
    count: val.count,
    amount: Math.round(val.amount * 100) / 100,
    percentage:
      completedOrders.length > 0 ? Math.round((val.count / completedOrders.length) * 1000) / 10 : 0,
  }));

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    completedOrdersCount: completedOrders.length,
    totalOrdersCount: filteredOrders.length,
    averageOrderValue,
    salesTimeline,
    topProducts,
    topCustomers,
    orderStatusCounts,
    paymentStatusCounts,
  };
}

// =========================================================================
// 3. EXPENSE REPORT
// =========================================================================

export interface ExpenseReportSummary {
  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  expensesCount: number;
  categoryBreakdown: Array<{
    category: string;
    name: string;
    totalAmount: number;
    count: number;
    percentage: number;
    color: string;
  }>;
  expensesTimeline: Array<{ date: string; label: string; amount: number; paidAmount: number }>;
  paymentMethodBreakdown: Array<{ method: string; count: number; amount: number; percentage: number }>;
  largestExpenses: Expense[];
}

export function calculateExpenseReport(params: {
  expenses: Expense[];
  expensePayments?: ExpensePayment[];
  startDate?: string;
  endDate?: string;
}): ExpenseReportSummary {
  const { expenses, expensePayments = [], startDate, endDate } = params;

  const activeExpenses = expenses.filter(
    (e) => !e.is_archived && isDateWithinRange(e.expense_date || e.created_at, startDate, endDate)
  );

  let totalExpenses = 0;
  let paidExpenses = 0;
  let unpaidExpenses = 0;

  const catMap = new Map<string, { amount: number; count: number }>();
  const methodMap = new Map<string, { amount: number; count: number }>();
  const dayMap = new Map<string, { amount: number; paidAmount: number }>();

  for (const exp of activeExpenses) {
    const eState = calculateExpensePaymentState(exp, expensePayments);
    totalExpenses += eState.totalAmount;
    paidExpenses += eState.amountPaid;
    unpaidExpenses += eState.outstandingBalance;

    const catKey = (exp.category || 'other').toLowerCase();
    const cEx = catMap.get(catKey) || { amount: 0, count: 0 };
    cEx.amount += eState.totalAmount;
    cEx.count += 1;
    catMap.set(catKey, cEx);

    const mKey = exp.payment_method || 'card';
    const mEx = methodMap.get(mKey) || { amount: 0, count: 0 };
    mEx.amount += eState.totalAmount;
    mEx.count += 1;
    methodMap.set(mKey, mEx);

    const day = (exp.expense_date || exp.created_at).slice(0, 10);
    const dEx = dayMap.get(day) || { amount: 0, paidAmount: 0 };
    dEx.amount += eState.totalAmount;
    dEx.paidAmount += eState.amountPaid;
    dayMap.set(day, dEx);
  }

  const categoryBreakdown = Array.from(catMap.entries())
    .map(([catKey, val]) => {
      const meta = resolveCategoryMetadata(catKey);
      return {
        category: catKey,
        name: meta.name,
        totalAmount: Math.round(val.amount * 100) / 100,
        count: val.count,
        percentage: totalExpenses > 0 ? Math.round((val.amount / totalExpenses) * 1000) / 10 : 0,
        color: meta.color,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const sortedDays = Array.from(dayMap.keys()).sort();
  const expensesTimeline = sortedDays.map((d) => {
    const val = dayMap.get(d)!;
    const [, month, dayNum] = d.split('-');
    return {
      date: d,
      label: `${month}/${dayNum}`,
      amount: Math.round(val.amount * 100) / 100,
      paidAmount: Math.round(val.paidAmount * 100) / 100,
    };
  });

  const paymentMethodBreakdown = Array.from(methodMap.entries()).map(([method, val]) => ({
    method,
    count: val.count,
    amount: Math.round(val.amount * 100) / 100,
    percentage: totalExpenses > 0 ? Math.round((val.amount / totalExpenses) * 1000) / 10 : 0,
  }));

  const largestExpenses = [...activeExpenses]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 10);

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    paidExpenses: Math.round(paidExpenses * 100) / 100,
    unpaidExpenses: Math.round(unpaidExpenses * 100) / 100,
    expensesCount: activeExpenses.length,
    categoryBreakdown,
    expensesTimeline,
    paymentMethodBreakdown,
    largestExpenses,
  };
}

// =========================================================================
// 4. PRODUCT & INVENTORY PERFORMANCE REPORT
// =========================================================================

export interface ProductInventoryMetrics {
  totalCatalogProducts: number;
  activeProductsCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryUnits: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  unrealizedGrossMargin: number;
  topSellers: Array<{
    product: Product;
    unitsSold: number;
    revenue: number;
    stockRemaining: number;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  }>;
  lowStockAlertList: Product[];
}

export function calculateProductPerformanceReport(params: {
  products: Product[];
  orders: SalesOrder[];
  orderItems: SalesOrderItem[];
  startDate?: string;
  endDate?: string;
}): ProductInventoryMetrics {
  const { products, orders, orderItems, startDate, endDate } = params;

  const validOrders = orders.filter(
    (o) =>
      (o.status === 'confirmed' || o.status === 'completed' || (o.status as any) === 'fulfilled') &&
      isDateWithinRange(o.order_date || o.created_at, startDate, endDate)
  );
  const validOrderIds = new Set(validOrders.map((o) => o.id));

  const unitsSoldMap = new Map<string, { unitsSold: number; revenue: number }>();
  for (const item of orderItems) {
    if (validOrderIds.has(item.order_id)) {
      const existing = unitsSoldMap.get(item.product_id) || { unitsSold: 0, revenue: 0 };
      existing.unitsSold += Number(item.quantity) || 0;
      existing.revenue += Number(item.line_total) || 0;
      unitsSoldMap.set(item.product_id, existing);
    }
  }

  let totalInventoryUnits = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const lowStockAlertList: Product[] = [];

  for (const p of products) {
    const qty = Math.max(0, Number(p.stock_quantity) || 0);
    const cost = Math.max(0, Number(p.cost_price) || 0);
    const price = Math.max(0, Number(p.selling_price) || 0);
    const threshold = p.low_stock_threshold !== undefined ? p.low_stock_threshold : 10;

    totalInventoryUnits += qty;
    totalCostValuation += qty * cost;
    totalRetailValuation += qty * price;

    if (qty === 0) {
      outOfStockCount++;
      lowStockAlertList.push(p);
    } else if (qty <= threshold) {
      lowStockCount++;
      lowStockAlertList.push(p);
    } else {
      inStockCount++;
    }
  }

  const unrealizedGrossMargin =
    totalRetailValuation > 0
      ? Math.round(
          ((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 1000
        ) / 10
      : 0;

  const topSellers = products
    .map((p) => {
      const sold = unitsSoldMap.get(p.id) || { unitsSold: 0, revenue: 0 };
      const qty = Math.max(0, Number(p.stock_quantity) || 0);
      const threshold = p.low_stock_threshold !== undefined ? p.low_stock_threshold : 10;
      const stockStatus =
        qty === 0 ? 'out_of_stock' : qty <= threshold ? 'low_stock' : 'in_stock';

      return {
        product: p,
        unitsSold: sold.unitsSold,
        revenue: Math.round(sold.revenue * 100) / 100,
        stockRemaining: qty,
        stockStatus: stockStatus as 'in_stock' | 'low_stock' | 'out_of_stock',
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalCatalogProducts: products.length,
    activeProductsCount: products.filter((p) => p.status === 'active').length,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    totalInventoryUnits,
    totalCostValuation: Math.round(totalCostValuation * 100) / 100,
    totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
    unrealizedGrossMargin,
    topSellers,
    lowStockAlertList,
  };
}

// =========================================================================
// 5. CUSTOMER ANALYTICS REPORT
// =========================================================================

export interface CustomerCohortSummary {
  totalCustomers: number;
  newCustomersInPeriod: number;
  activeBuyingCustomers: number;
  repeatCustomersCount: number;
  repeatCustomerRate: number;
  customerRankings: Array<{
    customer: Customer;
    ordersCount: number;
    totalSpent: number;
    lastOrderDate?: string;
    isRepeat: boolean;
  }>;
}

export function calculateCustomerAnalyticsReport(params: {
  customers: Customer[];
  orders: SalesOrder[];
  startDate?: string;
  endDate?: string;
}): CustomerCohortSummary {
  const { customers, orders, startDate, endDate } = params;

  const newCustomersInPeriod = customers.filter((c) =>
    isDateWithinRange(c.created_at, startDate, endDate)
  ).length;

  const validOrders = orders.filter(
    (o) =>
      (o.status === 'confirmed' || o.status === 'completed' || (o.status as any) === 'fulfilled') &&
      isDateWithinRange(o.order_date || o.created_at, startDate, endDate)
  );

  const customerOrderMap = new Map<
    string,
    { ordersCount: number; totalSpent: number; lastOrderDate?: string }
  >();

  for (const o of validOrders) {
    const existing = customerOrderMap.get(o.customer_id) || {
      ordersCount: 0,
      totalSpent: 0,
      lastOrderDate: undefined,
    };
    existing.ordersCount += 1;
    existing.totalSpent += Number(o.total_amount) || 0;
    const oDate = o.order_date || o.created_at;
    if (!existing.lastOrderDate || oDate > existing.lastOrderDate) {
      existing.lastOrderDate = oDate;
    }
    customerOrderMap.set(o.customer_id, existing);
  }

  let activeBuyingCustomers = 0;
  let repeatCustomersCount = 0;

  const customerRankings = customers
    .map((c) => {
      const stats = customerOrderMap.get(c.id) || {
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: undefined,
      };
      if (stats.ordersCount > 0) activeBuyingCustomers++;
      const isRepeat = stats.ordersCount >= 2;
      if (isRepeat) repeatCustomersCount++;

      return {
        customer: c,
        ordersCount: stats.ordersCount,
        totalSpent: Math.round(stats.totalSpent * 100) / 100,
        lastOrderDate: stats.lastOrderDate,
        isRepeat,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const repeatCustomerRate =
    activeBuyingCustomers > 0
      ? Math.round((repeatCustomersCount / activeBuyingCustomers) * 1000) / 10
      : 0;

  return {
    totalCustomers: customers.length,
    newCustomersInPeriod,
    activeBuyingCustomers,
    repeatCustomersCount,
    repeatCustomerRate,
    customerRankings,
  };
}

// =========================================================================
// 6. INVOICE AND PAYMENT RECEIVABLES REPORT
// =========================================================================

export interface InvoiceReceivablesSummary {
  totalInvoicedAmount: number;
  totalCollectedAmount: number;
  totalOutstandingBalance: number;
  overdueCount: number;
  overdueAmount: number;
  invoicesCount: number;
  paidInvoicesCount: number;
  issuedInvoicesCount: number;
  statusBreakdown: Array<{ status: string; count: number; amount: number; percentage: number }>;
  paymentTimeline: Array<{ date: string; label: string; amount: number }>;
}

export function calculateInvoicePaymentReport(params: {
  invoices: Invoice[];
  payments: Payment[];
  startDate?: string;
  endDate?: string;
}): InvoiceReceivablesSummary {
  const { invoices, payments, startDate, endDate } = params;

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.status !== 'voided' &&
      isDateWithinRange(inv.issue_date || inv.created_at, startDate, endDate)
  );

  let totalInvoicedAmount = 0;
  let totalCollectedAmount = 0;
  let totalOutstandingBalance = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let paidInvoicesCount = 0;
  let issuedInvoicesCount = 0;

  const statusMap = new Map<string, { count: number; amount: number }>();

  for (const inv of filteredInvoices) {
    const pState = calculateInvoicePaymentState(inv, payments);
    totalInvoicedAmount += pState.totalAmount;
    totalCollectedAmount += pState.amountPaid;
    totalOutstandingBalance += pState.outstandingBalance;

    if (pState.isPaid) {
      paidInvoicesCount++;
    } else {
      issuedInvoicesCount++;
      if (pState.isOverdue) {
        overdueCount++;
        overdueAmount += pState.outstandingBalance;
      }
    }

    const st = pState.isOverdue ? 'overdue' : pState.isPaid ? 'paid' : inv.status;
    const ex = statusMap.get(st) || { count: 0, amount: 0 };
    ex.count += 1;
    ex.amount += pState.totalAmount;
    statusMap.set(st, ex);
  }

  const statusBreakdown = Array.from(statusMap.entries()).map(([status, val]) => ({
    status,
    count: val.count,
    amount: Math.round(val.amount * 100) / 100,
    percentage:
      totalInvoicedAmount > 0 ? Math.round((val.amount / totalInvoicedAmount) * 1000) / 10 : 0,
  }));

  // Payments timeline
  const payDayMap = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== 'reversed' && isDateWithinRange(p.payment_date || p.created_at, startDate, endDate)) {
      const day = (p.payment_date || p.created_at).slice(0, 10);
      payDayMap.set(day, (payDayMap.get(day) || 0) + (Number(p.amount) || 0));
    }
  }

  const sortedPayDays = Array.from(payDayMap.keys()).sort();
  const paymentTimeline = sortedPayDays.map((d) => {
    const [, month, dayNum] = d.split('-');
    return {
      date: d,
      label: `${month}/${dayNum}`,
      amount: Math.round((payDayMap.get(d) || 0) * 100) / 100,
    };
  });

  return {
    totalInvoicedAmount: Math.round(totalInvoicedAmount * 100) / 100,
    totalCollectedAmount: Math.round(totalCollectedAmount * 100) / 100,
    totalOutstandingBalance: Math.round(totalOutstandingBalance * 100) / 100,
    overdueCount,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    invoicesCount: filteredInvoices.length,
    paidInvoicesCount,
    issuedInvoicesCount,
    statusBreakdown,
    paymentTimeline,
  };
}

// =========================================================================
// 7. REAL CSV EXPORT ENGINE
// =========================================================================

/**
 * Generates RFC 4180 compliant CSV string, creates a Blob, and triggers an automated download
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): boolean {
  try {
    const escapeCell = (val: string | number | boolean | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const headerLine = headers.map(escapeCell).join(',');
    const bodyLines = rows.map((r) => r.map(escapeCell).join(','));
    const csvContent = [headerLine, ...bodyLines].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to export CSV report:', err);
    return false;
  }
}
