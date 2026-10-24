/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  CreditCard,
  Scale,
  Users,
  ShoppingBag,
  Receipt,
  Plus,
  RefreshCw,
  Sparkles,
  Database,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { calculateProductStats } from '../../utils/product';
import { DateRangeKey } from '../../types/analytics';
import {
  calculateBusinessOverviewMetrics,
  buildTimeSeriesAnalytics,
  buildRecentTransactions,
  calculateTopProducts,
  DATE_RANGE_OPTIONS,
} from '../../utils/analytics';
import { formatCurrency } from '../../utils/formatters';
import { getSupabaseEnvConfig } from '../../services/supabase/config';
import {
  fetchBusinessRecords,
  seedSampleBusinessDataset,
  BusinessDataBundle,
} from '../../services/business/records';
import { DateRangeSelector } from '../../components/analytics/DateRangeSelector';
import { MetricCard } from '../../components/analytics/MetricCard';
import { SalesAnalyticsChart } from '../../components/analytics/SalesAnalyticsChart';
import { RevenueExpenseChart } from '../../components/analytics/RevenueExpenseChart';
import { RecentTransactionsTable } from '../../components/analytics/RecentTransactionsTable';
import { TopProductsCard } from '../../components/analytics/TopProductsCard';
import { QuickActionsBar } from '../../components/analytics/QuickActionsBar';
import { NewTransactionModal } from '../../components/analytics/NewTransactionModal';
import { Button } from '../../components/common/Button';
import { DeveloperCard } from '../../components/developer/DeveloperCard';
import { LoadingState } from '../../components/common/StateViewer';

export const DashboardPage: React.FC = () => {
  const { status: supabaseStatus } = getSupabaseEnvConfig();
  const [dateRange, setDateRange] = useState<DateRangeKey>('30d');
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
  const [isSeeding, setIsSeeding] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  // Load business records from database
  const loadRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const bundle = await fetchBusinessRecords();
      setDataBundle(bundle);
    } catch (err) {
      console.error('Failed to load business records:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Seed handler for test dataset
  const handleSeedDataset = async () => {
    setIsSeeding(true);
    try {
      const bundle = await seedSampleBusinessDataset();
      setDataBundle(bundle);
    } catch (err) {
      console.error('Failed to seed business dataset:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Aggregated analytics metrics derived strictly from authorized records
  const metrics = useMemo(() => {
    return calculateBusinessOverviewMetrics(
      dataBundle.orders,
      dataBundle.invoices,
      dataBundle.expenses,
      dataBundle.customers,
      dateRange
    );
  }, [dataBundle, dateRange]);

  // Time-series data points for charts
  const timeSeriesData = useMemo(() => {
    return buildTimeSeriesAnalytics(dataBundle.orders, dataBundle.expenses, dateRange);
  }, [dataBundle.orders, dataBundle.expenses, dateRange]);

  // Recent transactions table rows
  const recentTransactions = useMemo(() => {
    return buildRecentTransactions(
      dataBundle.orders,
      dataBundle.invoices,
      dataBundle.customers,
      8
    );
  }, [dataBundle.orders, dataBundle.invoices, dataBundle.customers]);

  // Top performing products derived strictly from sales line items/orders
  const topProducts = useMemo(() => {
    return calculateTopProducts(dataBundle.orders, dataBundle.products, dateRange);
  }, [dataBundle.orders, dataBundle.products, dateRange]);

  // Inventory catalog summary for stock alerts
  const productStats = useMemo(() => {
    return calculateProductStats(dataBundle.products);
  }, [dataBundle.products]);

  const activeRangeOption = DATE_RANGE_OPTIONS.find((o) => o.key === dateRange);
  const rangeLabel = activeRangeOption ? activeRangeOption.label : 'Last 30 Days';

  const totalRecordsCount =
    dataBundle.orders.length +
    dataBundle.invoices.length +
    dataBundle.expenses.length +
    dataBundle.customers.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Dashboard Title & Date Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 tracking-tight">
              Business Overview & Analytics
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time financial performance, order pipeline, and operating expenses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsTransactionModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Transaction
          </Button>
        </div>
      </div>

      {/* Workspace Initialization Alert (Clean, Friendly, Non-Technical) */}
      {dataBundle.tablesMissing && (
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3 text-xs text-zinc-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Your workspace is being set up. Please try again shortly.</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">Please contact your workspace administrator if database setup is still in progress.</p>
            </div>
          </div>
        </div>
      )}

      {/* Friendly New Workspace State */}
      {totalRecordsCount === 0 && !isLoading && !dataBundle.tablesMissing && (
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-950/60 border border-rose-900/50 flex items-center justify-center text-rose-400 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-100">
                Welcome to your Cherryflow Workspace
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Your workspace is ready. Begin by adding products, registering customers, or recording your first sales order using the quick actions below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSeedDataset}
              isLoading={isSeeding}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-rose-400" />}
            >
              Load Sample Data
            </Button>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Bar */}
      <QuickActionsBar
        onSeedDemoDataset={handleSeedDataset}
        onRefreshData={() => loadRecords(true)}
        isSeeding={isSeeding}
        isRefreshing={isRefreshing}
      />

      {/* Inventory Attention Alert Banner */}
      {!isLoading && (productStats.lowStock > 0 || productStats.outOfStock > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-200">
                Inventory Attention Required:{' '}
                {productStats.outOfStock > 0 && (
                  <span className="text-rose-400 font-bold">{productStats.outOfStock} out of stock</span>
                )}
                {productStats.outOfStock > 0 && productStats.lowStock > 0 && ', '}
                {productStats.lowStock > 0 && (
                  <span className="text-amber-300 font-bold">{productStats.lowStock} low on stock</span>
                )}
              </p>
              <p className="text-[11px] text-zinc-400">
                Review inventory levels and log stock movements to ensure seamless order fulfillment.
              </p>
            </div>
          </div>
          <Link
            to="/app/products"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-500/30 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <span>Manage Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Calculating business analytics from authorized database records..." />
        </div>
      ) : (
        <>
          {/* Business Overview Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Sales */}
            <MetricCard
              label="Total Sales (Gross Realized)"
              value={formatCurrency(metrics.totalSales)}
              icon={TrendingUp}
              subtitle="Confirmed and fulfilled order revenue"
              formulaNote="Only confirmed/fulfilled orders are counted. Drafts excluded."
              highlight={true}
              isEmpty={!metrics.hasData && metrics.totalSales === 0}
              emptyMessage="No sales recorded"
            />

            {/* Total Expenses */}
            <MetricCard
              label="Total Operating Expenses"
              value={formatCurrency(metrics.totalExpenses)}
              icon={CreditCard}
              subtitle="Recorded disbursements & vendor payouts"
              formulaNote="Sum of all authorized expense disbursements in range."
              isEmpty={!metrics.hasData && metrics.totalExpenses === 0}
              emptyMessage="No expenses recorded"
            />

            {/* Net Profit */}
            <MetricCard
              label="Net Operating Profit"
              value={formatCurrency(metrics.netProfit)}
              icon={Scale}
              subtitle={
                metrics.totalSales > 0
                  ? `Operating margin: ${((metrics.netProfit / metrics.totalSales) * 100).toFixed(1)}%`
                  : 'Based on recorded revenue & disbursements'
              }
              formulaNote="Formula: Realized Sales ($) - Operating Expenses ($)"
              statusBadge={metrics.netProfit >= 0 ? 'Profitable' : 'Deficit'}
              badgeVariant={metrics.netProfit >= 0 ? 'success' : 'danger'}
              highlight={metrics.netProfit > 0}
              isEmpty={!metrics.hasData && metrics.netProfit === 0}
              emptyMessage="Awaiting transaction data"
            />

            {/* Total Customers */}
            <MetricCard
              label="Total Customers"
              value={metrics.totalCustomers}
              icon={Users}
              subtitle="Registered commercial accounts and clients"
              formulaNote="Active directory contacts with billing information."
              isEmpty={dataBundle.customers.length === 0}
              emptyMessage="No customer records"
            />

            {/* Total Orders */}
            <MetricCard
              label="Total Orders Placed"
              value={metrics.totalOrders}
              icon={ShoppingBag}
              subtitle={`Average order value: ${formatCurrency(metrics.averageOrderValue)}`}
              formulaNote="Sales orders generated within the selected timeframe."
              isEmpty={metrics.totalOrders === 0}
              emptyMessage="No orders in range"
            />

            {/* Outstanding Invoices */}
            <MetricCard
              label="Outstanding Invoices (Receivables)"
              value={formatCurrency(metrics.outstandingInvoicesAmount)}
              icon={Receipt}
              subtitle={`${metrics.outstandingInvoicesCount} issued or overdue invoice${metrics.outstandingInvoicesCount === 1 ? '' : 's'}`}
              formulaNote="Active unpaid balance (total - paid) on open invoices."
              statusBadge={metrics.outstandingInvoicesAmount > 0 ? 'Receivables' : 'Settled'}
              badgeVariant={metrics.outstandingInvoicesAmount > 0 ? 'warning' : 'success'}
              isEmpty={dataBundle.invoices.length === 0}
              emptyMessage="No invoices generated"
            />
          </div>

          {/* Transparent Accounting Methodology Disclosure */}
          <div className="px-4 py-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>
                <strong className="text-zinc-300 font-medium">Accounting Methodology:</strong> {metrics.accountingNote}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="text-rose-400 hover:text-rose-300 text-[11px] underline cursor-pointer self-start sm:self-auto"
            >
              {showFormulaInfo ? 'Hide derivation details' : 'View calculation rules'}
            </button>
          </div>

          {showFormulaInfo && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 space-y-2 animate-in fade-in duration-150">
              <p className="font-semibold text-zinc-200 uppercase text-[11px] tracking-wider">
                Financial Formula Transparency:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>
                  <span className="text-zinc-200">Total Sales:</span> SUM(sales_orders.total_amount) WHERE status IN ('confirmed', 'fulfilled') AND order_date WITHIN selected_date_bounds.
                </li>
                <li>
                  <span className="text-zinc-200">Total Expenses:</span> SUM(expenses.amount) WHERE expense_date WITHIN selected_date_bounds.
                </li>
                <li>
                  <span className="text-zinc-200">Net Profit:</span> Total Sales - Total Expenses. Unpaid invoices are deliberately not recognized as completed sales until fulfilled.
                </li>
                <li>
                  <span className="text-zinc-200">Outstanding Receivables:</span> SUM(invoices.total_amount - invoices.amount_paid) WHERE status IN ('issued', 'overdue').
                </li>
              </ul>
            </div>
          )}

          {/* Interactive Recharts Analytics Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Analytics Chart */}
            <SalesAnalyticsChart
              data={timeSeriesData}
              dateRangeLabel={rangeLabel}
            />

            {/* Revenue vs Expense Chart */}
            <RevenueExpenseChart
              data={timeSeriesData}
              dateRangeLabel={rangeLabel}
            />
          </div>

          {/* Bottom Grid: Recent Transactions and Top Performing Products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentTransactionsTable
                transactions={recentTransactions}
                onOpenNewTransactionModal={() => setIsTransactionModalOpen(true)}
              />
            </div>
            <div className="lg:col-span-1">
              <TopProductsCard
                products={topProducts}
                dateRangeLabel={rangeLabel}
              />
            </div>
          </div>
        </>
      )}

      {/* Developer Information Card inside App Workspace */}
      <div className="space-y-3 pt-4 border-t border-zinc-800/80">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-bold text-zinc-200">System Architect & Developer</h3>
        </div>
        <DeveloperCard variant="compact" />
      </div>

      {/* Modal for recording new transaction */}
      <NewTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        customers={dataBundle.customers}
        onTransactionCreated={() => loadRecords(true)}
      />
    </div>
  );
};
