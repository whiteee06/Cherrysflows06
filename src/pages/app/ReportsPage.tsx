/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Users,
  Receipt,
  Package,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { EmptyState, LoadingState } from '../../components/common/StateViewer';
import { fetchBusinessRecords, BusinessDataBundle } from '../../services/business/records';
import { formatCurrency, formatDate, getStatusBadgeVariant } from '../../utils/formatters';
import {
  ReportDatePreset,
  getReportDateRangeBounds,
  calculateFinancialReport,
  calculateSalesReport,
  calculateExpenseReport,
  calculateProductPerformanceReport,
  calculateCustomerAnalyticsReport,
  calculateInvoicePaymentReport,
  exportToCsv,
} from '../../utils/reports';
import { siteConfig } from '../../config/site';

type ReportTab =
  | 'overview'
  | 'sales'
  | 'expenses'
  | 'profitability'
  | 'products'
  | 'customers'
  | 'invoices';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [datePreset, setDatePreset] = useState<ReportDatePreset>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [dataBundle, setDataBundle] = useState<BusinessDataBundle>({
    orders: [],
    orderItems: [],
    invoices: [],
    payments: [],
    expenses: [],
    customers: [],
    products: [],
    adjustments: [],
    storageSource: 'local_workspace',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const bundle = await fetchBusinessRecords();
      setDataBundle(bundle);
    } catch (err) {
      console.error('Error loading business records for reports:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute date range boundary
  const dateRange = useMemo(() => {
    return getReportDateRangeBounds(datePreset, customStart, customEnd);
  }, [datePreset, customStart, customEnd]);

  // 1. Executive Financial Report
  const financialSummary = useMemo(() => {
    return calculateFinancialReport({
      orders: dataBundle.orders,
      orderItems: dataBundle.orderItems || [],
      invoices: dataBundle.invoices,
      payments: dataBundle.payments || [],
      expenses: dataBundle.expenses,
      products: dataBundle.products,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [dataBundle, dateRange]);

  // 2. Sales Report
  const salesSummary = useMemo(() => {
    return calculateSalesReport({
      orders: dataBundle.orders,
      orderItems: dataBundle.orderItems || [],
      customers: dataBundle.customers,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [dataBundle, dateRange]);

  // 3. Expense Report
  const expenseSummary = useMemo(() => {
    return calculateExpenseReport({
      expenses: dataBundle.expenses,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [dataBundle, dateRange]);

  // 4. Product & Inventory Report
  const productSummary = useMemo(() => {
    return calculateProductPerformanceReport({
      products: dataBundle.products,
      orders: dataBundle.orders,
      orderItems: dataBundle.orderItems || [],
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [dataBundle, dateRange]);

  // 5. Customer Analytics Report
  const customerSummary = useMemo(() => {
    return calculateCustomerAnalyticsReport({
      customers: dataBundle.customers,
      orders: dataBundle.orders,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [dataBundle, dateRange]);

  // 6. Invoices & Receivables Report
  const invoiceSummary = useMemo(() => {
    return calculateInvoicePaymentReport({
      invoices: dataBundle.invoices,
      payments: dataBundle.payments || [],
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [dataBundle, dateRange]);

  // Handle Export CSV based on active tab
  const handleExportCurrentReport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const prefix = `cherryflow_${activeTab}_report_${timestamp}`;

    if (activeTab === 'overview' || activeTab === 'profitability') {
      const headers = ['Month', 'Label', 'Revenue ($)', 'Cash Collected ($)', 'Expenses ($)', 'Disbursed ($)', 'Gross Profit ($)', 'Net Profit ($)'];
      const rows = financialSummary.monthlyTrends.map((t) => [
        t.month,
        t.label,
        t.revenue,
        t.cashCollected,
        t.expenses,
        t.cashPaidOut,
        t.grossProfit,
        t.netProfit,
      ]);
      exportToCsv(prefix, headers, rows);
    } else if (activeTab === 'sales') {
      const headers = ['Order Number', 'Date', 'Customer ID', 'Status', 'Payment Status', 'Subtotal ($)', 'Tax ($)', 'Total ($)', 'Notes'];
      const rows = dataBundle.orders.map((o) => [
        o.order_number,
        o.order_date || o.created_at,
        o.customer_id,
        o.status,
        o.payment_status || 'unpaid',
        o.subtotal || o.total_amount * 0.9,
        o.tax_amount || o.total_amount * 0.1,
        o.total_amount,
        o.notes || '',
      ]);
      exportToCsv(prefix, headers, rows);
    } else if (activeTab === 'expenses') {
      const headers = ['Vendor', 'Category', 'Date', 'Payment Method', 'Payment Status', 'Amount ($)', 'Amount Paid ($)', 'Description', 'Notes'];
      const rows = dataBundle.expenses.map((e) => [
        e.vendor,
        e.category,
        e.expense_date,
        e.payment_method,
        e.payment_status || 'unpaid',
        e.amount,
        e.amount_paid || 0,
        e.description,
        e.notes || '',
      ]);
      exportToCsv(prefix, headers, rows);
    } else if (activeTab === 'products') {
      const headers = ['Product Name', 'SKU', 'Category', 'Selling Price ($)', 'Cost Price ($)', 'Stock Remaining', 'Units Sold', 'Revenue ($)', 'Status'];
      const rows = productSummary.topSellers.map((s) => [
        s.product.name,
        s.product.sku,
        s.product.category || 'General',
        s.product.selling_price,
        s.product.cost_price,
        s.stockRemaining,
        s.unitsSold,
        s.revenue,
        s.stockStatus,
      ]);
      exportToCsv(prefix, headers, rows);
    } else if (activeTab === 'customers') {
      const headers = ['Customer Name', 'Company', 'Email', 'Phone', 'Orders Count', 'Total Spent ($)', 'Last Order Date', 'Is Repeat Customer'];
      const rows = customerSummary.customerRankings.map((r) => [
        r.customer.name,
        r.customer.company_name || '',
        r.customer.email,
        r.customer.phone || '',
        r.ordersCount,
        r.totalSpent,
        r.lastOrderDate || '',
        r.isRepeat ? 'YES' : 'NO',
      ]);
      exportToCsv(prefix, headers, rows);
    } else if (activeTab === 'invoices') {
      const headers = ['Invoice Number', 'Issue Date', 'Due Date', 'Customer ID', 'Status', 'Total ($)', 'Amount Paid ($)', 'Balance Due ($)'];
      const rows = dataBundle.invoices.map((inv) => {
        const bal = Math.max(0, inv.total_amount - (inv.amount_paid || 0));
        return [
          inv.invoice_number,
          inv.issue_date,
          inv.due_date,
          inv.customer_id,
          inv.status,
          inv.total_amount,
          inv.amount_paid || 0,
          bal,
        ];
      });
      exportToCsv(prefix, headers, rows);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Printable Report Header (visible on print only) */}
      <div className="hidden print:block mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold text-zinc-900">{siteConfig.name} Executive Report</h1>
        <p className="text-sm text-zinc-600">
          Generated on {new Date().toLocaleDateString()} · Period: {dateRange.label}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Architect: {siteConfig.developer.name} ({siteConfig.developer.email})
        </p>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-100">Reports & Analytics</h2>
            <Badge variant="cherry" size="sm">Financial Intelligence</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Authoritative financial ledgers, profitability models, customer cohorts, and inventory valuation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadData(true)}
            aria-label="Refresh reports data"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-500' : ''}`} />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCurrentReport}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintReport}
            leftIcon={<Printer className="w-4 h-4 text-rose-400" />}
          >
            Print Summary
          </Button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="w-4 h-4 text-rose-400" />
          <span className="font-semibold text-zinc-200">Period:</span>
          <span className="text-zinc-400 font-mono text-[11px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            {dateRange.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setDatePreset(preset.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <span className="text-zinc-500 text-xs">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        )}
      </div>

      {/* Main Report Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-zinc-800 text-xs print:hidden">
        {(
          [
            { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
            { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
            { id: 'expenses', label: 'Operating Expenses', icon: CreditCard },
            { id: 'profitability', label: 'P&L & Margins', icon: Scale },
            { id: 'products', label: 'Products & Stock', icon: Package },
            { id: 'customers', label: 'Customer Cohorts', icon: Users },
            { id: 'invoices', label: 'Invoices & Receivables', icon: Receipt },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                isActive
                  ? 'border-rose-500 text-rose-400 bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Body by Tab */}
      {isLoading ? (
        <LoadingState label="Computing multi-dimensional reporting models from database..." />
      ) : (
        <div className="space-y-6">
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Overview Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Realized Revenue</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-zinc-100">
                      {formatCurrency(financialSummary.realizedOrderRevenue)}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Confirmed & fulfilled customer commitments
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Operating Expenses</span>
                      <CreditCard className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-rose-400">
                      {formatCurrency(financialSummary.totalOperatingExpenses)}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {formatCurrency(financialSummary.cashPaidExpenses)} cash settled
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Estimated Net Profit</span>
                      <Scale className={`w-4 h-4 ${financialSummary.estimatedNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                    </div>
                    <div className={`text-2xl font-bold font-mono ${financialSummary.estimatedNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(financialSummary.estimatedNetProfit)}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {financialSummary.netProfitMargin}% net margin
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Working Capital (AR - AP)</span>
                      <DollarSign className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-cyan-400">
                      {formatCurrency(financialSummary.netWorkingCapitalBalance)}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {formatCurrency(financialSummary.accountsReceivableOutstanding)} AR · {formatCurrency(financialSummary.accountsPayableOutstanding)} AP
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Revenue vs Expense Visual Chart */}
              <Card className="border-zinc-800">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Monthly Performance & Cash Flow Trend</CardTitle>
                      <CardDescription>
                        Revenue, cash collected, and operating expenses across reporting periods
                      </CardDescription>
                    </div>
                    <Badge variant="outline" size="sm">
                      Recharts Interactive
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {financialSummary.monthlyTrends.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
                      No historical timeline data recorded in the selected period.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={financialSummary.monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                          <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                            formatter={(value: any) => [formatCurrency(Number(value) || 0), '']}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Area type="monotone" dataKey="revenue" name="Booked Sales" stroke="#10b981" fillOpacity={1} fill="url(#revenueGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="expenses" name="Operating Expenses" stroke="#f43f5e" fillOpacity={1} fill="url(#expenseGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Financial Table */}
              <Card className="border-zinc-800">
                <CardHeader className="py-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Consolidated Financial Ledger</CardTitle>
                      <CardDescription>
                        Internal operational statement for management reporting
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleExportCurrentReport} leftIcon={<Download className="w-3.5 h-3.5" />}>
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 font-medium">Period</th>
                        <th className="px-4 py-3 font-medium text-right">Realized Revenue</th>
                        <th className="px-4 py-3 font-medium text-right">Cash Collected</th>
                        <th className="px-4 py-3 font-medium text-right">Recorded Expenses</th>
                        <th className="px-4 py-3 font-medium text-right">Cash Paid</th>
                        <th className="px-4 py-3 font-medium text-right">Gross Profit</th>
                        <th className="px-4 py-3 font-medium text-right">Estimated Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-400">
                      {financialSummary.monthlyTrends.map((row) => (
                        <tr key={row.month} className="hover:bg-zinc-800/30">
                          <td className="px-4 py-3.5 text-zinc-200 font-sans font-medium">{row.label}</td>
                          <td className="px-4 py-3.5 text-right text-emerald-400 font-semibold">{formatCurrency(row.revenue)}</td>
                          <td className="px-4 py-3.5 text-right">{formatCurrency(row.cashCollected)}</td>
                          <td className="px-4 py-3.5 text-right text-rose-400">{formatCurrency(row.expenses)}</td>
                          <td className="px-4 py-3.5 text-right">{formatCurrency(row.cashPaidOut)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-zinc-100">{formatCurrency(row.grossProfit)}</td>
                          <td className={`px-4 py-3.5 text-right font-bold ${row.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(row.netProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Accounting Disclosures */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-3 text-xs text-zinc-400">
                <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-zinc-200">Management Accounting Policy & Transparency Notes</p>
                  <p>
                    • Gross revenue is recognized upon order confirmation/completion. Draft and cancelled orders are excluded from revenue recognition.
                  </p>
                  <p>
                    • Cost of Goods Sold (COGS) is calculated from unit cost prices snapshot at fulfillment. Unpaid accounts receivable ($
                    {financialSummary.accountsReceivableOutstanding.toFixed(2)}) and unpaid expense obligations ($
                    {financialSummary.accountsPayableOutstanding.toFixed(2)}) are tracked separately from cash-basis movements.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    These metrics represent internal business analytics and do not constitute formal GAAP/IFRS audited financial statements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALES REPORTS */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Sales Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Sales Value</span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{formatCurrency(salesSummary.totalSales)}</div>
                    <p className="text-[10px] text-zinc-500">{salesSummary.completedOrdersCount} completed orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Average Order Value (AOV)</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(salesSummary.averageOrderValue)}</div>
                    <p className="text-[10px] text-zinc-500">Per confirmed transaction</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Orders Logged</span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{salesSummary.totalOrdersCount}</div>
                    <p className="text-[10px] text-zinc-500">Including drafts & pipeline</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Top Product Contribution</span>
                    <div className="text-2xl font-bold font-mono text-rose-400">
                      {salesSummary.topProducts[0] ? `${salesSummary.topProducts[0].percentage}%` : '0%'}
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {salesSummary.topProducts[0] ? salesSummary.topProducts[0].name : 'No items sold yet'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Sales Timeline Chart */}
              <Card className="border-zinc-800">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold">Sales Revenue Velocity</CardTitle>
                  <CardDescription>Daily revenue and order volume in the selected period</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {salesSummary.salesTimeline.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-xs text-zinc-500">
                      No sales recorded in the selected window.
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesSummary.salesTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                          <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                            formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Sales']}
                          />
                          <Area type="monotone" dataKey="sales" name="Sales" stroke="#e11d48" fillOpacity={1} fill="url(#salesGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Products & Top Customers Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-zinc-800">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold">Top Products by Revenue</CardTitle>
                    <CardDescription>Performance based on completed order line snapshots</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-2.5">Product</th>
                          <th className="px-4 py-2.5 text-right">Units</th>
                          <th className="px-4 py-2.5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {salesSummary.topProducts.slice(0, 5).map((p) => (
                          <tr key={p.productId} className="hover:bg-zinc-800/20">
                            <td className="px-4 py-2.5 font-sans">
                              <div className="font-medium text-zinc-200">{p.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">{p.sku}</div>
                            </td>
                            <td className="px-4 py-2.5 text-right">{p.unitsSold}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-400 font-bold">{formatCurrency(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold">Top Customers by Volume</CardTitle>
                    <CardDescription>Accounts generating the largest sales commitments</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-2.5">Customer</th>
                          <th className="px-4 py-2.5 text-right">Orders</th>
                          <th className="px-4 py-2.5 text-right">Total Spent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {salesSummary.topCustomers.slice(0, 5).map((c) => (
                          <tr key={c.customerId} className="hover:bg-zinc-800/20">
                            <td className="px-4 py-2.5 font-sans font-medium text-zinc-200">{c.name}</td>
                            <td className="px-4 py-2.5 text-right">{c.ordersCount}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-400 font-bold">{formatCurrency(c.totalSpent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSE REPORTS */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Expense Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Recorded Expenses</span>
                    <div className="text-2xl font-bold font-mono text-rose-400">{formatCurrency(expenseSummary.totalExpenses)}</div>
                    <p className="text-[10px] text-zinc-500">{expenseSummary.expensesCount} expenses logged</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Cash Settled</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(expenseSummary.paidExpenses)}</div>
                    <p className="text-[10px] text-zinc-500">Paid disbursements</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Unpaid Accounts Payable</span>
                    <div className="text-2xl font-bold font-mono text-amber-400">{formatCurrency(expenseSummary.unpaidExpenses)}</div>
                    <p className="text-[10px] text-zinc-500">Outstanding obligations</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Largest Cost Category</span>
                    <div className="text-xl font-bold text-zinc-200 truncate">
                      {expenseSummary.categoryBreakdown[0] ? expenseSummary.categoryBreakdown[0].name : 'None'}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {expenseSummary.categoryBreakdown[0] ? `${expenseSummary.categoryBreakdown[0].percentage}% of total` : '0%'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Expense Category Breakdown Chart */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-zinc-800">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold">Expense Categories Distribution</CardTitle>
                    <CardDescription>Proportional overhead split across operating areas</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {expenseSummary.categoryBreakdown.length === 0 ? (
                      <div className="h-56 flex items-center justify-center text-xs text-zinc-500">No categorized expenses</div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseSummary.categoryBreakdown}
                              dataKey="totalAmount"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={45}
                              paddingAngle={3}
                            >
                              {expenseSummary.categoryBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#f43f5e'} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                              formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Amount']}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Largest Recorded Expenses */}
                <Card className="border-zinc-800">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold">Largest Recorded Disbursements</CardTitle>
                    <CardDescription>Top operating expenditures recorded in the ledger</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-2.5">Vendor</th>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {expenseSummary.largestExpenses.slice(0, 5).map((e) => (
                          <tr key={e.id} className="hover:bg-zinc-800/20">
                            <td className="px-4 py-2.5 font-sans font-medium text-zinc-200">{e.vendor}</td>
                            <td className="px-4 py-2.5 font-sans capitalize">{e.category}</td>
                            <td className="px-4 py-2.5 font-sans">{formatDate(e.expense_date)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-rose-400">{formatCurrency(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: PROFITABILITY & P&L */}
          {activeTab === 'profitability' && (
            <div className="space-y-6">
              {/* Financial Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Gross Margin %</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{financialSummary.grossProfitMargin}%</div>
                    <p className="text-[10px] text-zinc-500">Gross Profit: {formatCurrency(financialSummary.grossProfit)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Cost of Goods Sold (COGS)</span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{formatCurrency(financialSummary.costOfGoodsSold)}</div>
                    <p className="text-[10px] text-zinc-500">Direct product unit cost</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Net Profit Margin %</span>
                    <div className={`text-2xl font-bold font-mono ${financialSummary.netProfitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {financialSummary.netProfitMargin}%
                    </div>
                    <p className="text-[10px] text-zinc-500">Net: {formatCurrency(financialSummary.estimatedNetProfit)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Net Working Capital</span>
                    <div className="text-2xl font-bold font-mono text-cyan-400">{formatCurrency(financialSummary.netWorkingCapitalBalance)}</div>
                    <p className="text-[10px] text-zinc-500">AR minus AP</p>
                  </CardContent>
                </Card>
              </div>

              {/* Profitability Breakdown Chart */}
              <Card className="border-zinc-800">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold">Profitability Waterfall Structure</CardTitle>
                  <CardDescription>Flow from gross sales through direct product costs and overhead to net profit</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Revenue', amount: financialSummary.realizedOrderRevenue, fill: '#10b981' },
                          { name: 'COGS', amount: financialSummary.costOfGoodsSold, fill: '#f59e0b' },
                          { name: 'Gross Profit', amount: financialSummary.grossProfit, fill: '#3b82f6' },
                          { name: 'Operating Exp', amount: financialSummary.totalOperatingExpenses, fill: '#f43f5e' },
                          { name: 'Net Profit', amount: financialSummary.estimatedNetProfit, fill: financialSummary.estimatedNetProfit >= 0 ? '#10b981' : '#f43f5e' },
                        ]}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                          formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Amount']}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: PRODUCTS & INVENTORY */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Product Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Asset Valuation (Cost)</span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{formatCurrency(productSummary.totalCostValuation)}</div>
                    <p className="text-[10px] text-zinc-500">{productSummary.totalInventoryUnits} units on hand</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Retail Inventory Value</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(productSummary.totalRetailValuation)}</div>
                    <p className="text-[10px] text-zinc-500">{productSummary.unrealizedGrossMargin}% potential margin</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Healthy Stock SKUs</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{productSummary.inStockCount}</div>
                    <p className="text-[10px] text-zinc-500">Above low-stock alert</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Stockout Risk Alerts</span>
                    <div className="text-2xl font-bold font-mono text-rose-400">
                      {productSummary.lowStockCount + productSummary.outOfStockCount}
                    </div>
                    <p className="text-[10px] text-zinc-500">{productSummary.outOfStockCount} out of stock</p>
                  </CardContent>
                </Card>
              </div>

              {/* Product Performance Table */}
              <Card className="border-zinc-800">
                <CardHeader className="py-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Catalog Performance & On-Hand Inventory</CardTitle>
                      <CardDescription>Sales velocity and remaining stock per product</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleExportCurrentReport} leftIcon={<Download className="w-3.5 h-3.5" />}>
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Selling Price</th>
                        <th className="px-4 py-3 text-right">Cost Price</th>
                        <th className="px-4 py-3 text-right">Stock On-Hand</th>
                        <th className="px-4 py-3 text-right">Units Sold</th>
                        <th className="px-4 py-3 text-right">Total Revenue</th>
                        <th className="px-4 py-3">Stock Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {productSummary.topSellers.map((item) => (
                        <tr key={item.product.id} className="hover:bg-zinc-800/20">
                          <td className="px-4 py-3 font-sans font-medium text-zinc-200">{item.product.name}</td>
                          <td className="px-4 py-3 text-zinc-400">{item.product.sku}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.product.selling_price)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.product.cost_price)}</td>
                          <td className="px-4 py-3 text-right font-bold text-zinc-100">{item.stockRemaining}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{item.unitsSold}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCurrency(item.revenue)}</td>
                          <td className="px-4 py-3 font-sans">
                            <Badge
                              variant={
                                item.stockStatus === 'in_stock'
                                  ? 'success'
                                  : item.stockStatus === 'low_stock'
                                  ? 'warning'
                                  : 'danger'
                              }
                              size="sm"
                            >
                              {item.stockStatus.replace('_', ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 6: CUSTOMER COHORTS */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              {/* Customer Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Customer Accounts</span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{customerSummary.totalCustomers}</div>
                    <p className="text-[10px] text-zinc-500">Registered commercial clients</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Active Buying Accounts</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{customerSummary.activeBuyingCustomers}</div>
                    <p className="text-[10px] text-zinc-500">With completed purchases</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Repeat Customer Rate</span>
                    <div className="text-2xl font-bold font-mono text-rose-400">{customerSummary.repeatCustomerRate}%</div>
                    <p className="text-[10px] text-zinc-500">{customerSummary.repeatCustomersCount} clients with ≥ 2 orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">New Clients in Period</span>
                    <div className="text-2xl font-bold font-mono text-cyan-400">{customerSummary.newCustomersInPeriod}</div>
                    <p className="text-[10px] text-zinc-500">Created during window</p>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Lifetime Table */}
              <Card className="border-zinc-800">
                <CardHeader className="py-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Customer Account Value & Frequency</CardTitle>
                      <CardDescription>Ranked by cumulative completed sales commitments</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleExportCurrentReport} leftIcon={<Download className="w-3.5 h-3.5" />}>
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Customer Account</th>
                        <th className="px-4 py-3">Contact Email</th>
                        <th className="px-4 py-3 text-right">Orders Count</th>
                        <th className="px-4 py-3 text-right">Total Spent</th>
                        <th className="px-4 py-3">Last Order Date</th>
                        <th className="px-4 py-3">Repeat Client</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {customerSummary.customerRankings.map((c) => (
                        <tr key={c.customer.id} className="hover:bg-zinc-800/20">
                          <td className="px-4 py-3 font-sans">
                            <div className="font-medium text-zinc-200">{c.customer.name}</div>
                            {c.customer.company_name && <div className="text-[11px] text-zinc-500">{c.customer.company_name}</div>}
                          </td>
                          <td className="px-4 py-3 font-sans text-zinc-400">{c.customer.email}</td>
                          <td className="px-4 py-3 text-right">{c.ordersCount}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCurrency(c.totalSpent)}</td>
                          <td className="px-4 py-3 font-sans">{c.lastOrderDate ? formatDate(c.lastOrderDate) : '—'}</td>
                          <td className="px-4 py-3 font-sans">
                            {c.isRepeat ? (
                              <Badge variant="success" size="sm">Repeat Buyer</Badge>
                            ) : c.ordersCount === 1 ? (
                              <Badge variant="outline" size="sm">One-Time</Badge>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 7: INVOICES & RECEIVABLES */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              {/* Invoices Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Billed Invoices</span>
                    <div className="text-2xl font-bold font-mono text-zinc-100">{formatCurrency(invoiceSummary.totalInvoicedAmount)}</div>
                    <p className="text-[10px] text-zinc-500">{invoiceSummary.invoicesCount} invoices issued</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Collected Cash Receipts</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(invoiceSummary.totalCollectedAmount)}</div>
                    <p className="text-[10px] text-zinc-500">{invoiceSummary.paidInvoicesCount} settled invoices</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Outstanding Balance (AR)</span>
                    <div className="text-2xl font-bold font-mono text-amber-400">{formatCurrency(invoiceSummary.totalOutstandingBalance)}</div>
                    <p className="text-[10px] text-zinc-500">{invoiceSummary.issuedInvoicesCount} awaiting payment</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-4 space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Overdue Invoices</span>
                    <div className="text-2xl font-bold font-mono text-rose-400">{formatCurrency(invoiceSummary.overdueAmount)}</div>
                    <p className="text-[10px] text-zinc-500">{invoiceSummary.overdueCount} invoices past due date</p>
                  </CardContent>
                </Card>
              </div>

              {/* Receivables Aging Table */}
              <Card className="border-zinc-800">
                <CardHeader className="py-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Accounts Receivable Aging & Settlement Ledger</CardTitle>
                      <CardDescription>Track pending customer remittances and overdue items</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleExportCurrentReport} leftIcon={<Download className="w-3.5 h-3.5" />}>
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Invoice Number</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Total Payable</th>
                        <th className="px-4 py-3 text-right">Amount Paid</th>
                        <th className="px-4 py-3 text-right">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {dataBundle.invoices.map((inv) => {
                        const bal = Math.max(0, inv.total_amount - (inv.amount_paid || 0));
                        return (
                          <tr key={inv.id} className="hover:bg-zinc-800/20">
                            <td className="px-4 py-3 text-rose-400 font-bold">{inv.invoice_number}</td>
                            <td className="px-4 py-3 font-sans">{formatDate(inv.issue_date || inv.created_at)}</td>
                            <td className="px-4 py-3 font-sans">{formatDate(inv.due_date)}</td>
                            <td className="px-4 py-3 font-sans">
                              <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                                {inv.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-100 font-bold">{formatCurrency(inv.total_amount)}</td>
                            <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(inv.amount_paid || 0)}</td>
                            <td className={`px-4 py-3 text-right font-bold ${bal > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                              {formatCurrency(bal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
