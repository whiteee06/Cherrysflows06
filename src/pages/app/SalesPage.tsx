/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Receipt,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState, LoadingState } from '../../components/common/StateViewer';
import { fetchBusinessRecords } from '../../services/business/records';
import {
  SalesOrder,
  SalesOrderItem,
  Customer,
  Product,
  Invoice,
  Payment,
  SalesOrderStatus,
} from '../../types/database';
import { formatCurrency, formatDate, getStatusBadgeVariant } from '../../utils/formatters';
import {
  calculateSalesDashboardMetrics,
  filterAndSortOrders,
} from '../../utils/sales';
import { CreateSaleModal } from '../../components/sales/CreateSaleModal';
import { OrderDetailModal } from '../../components/sales/OrderDetailModal';
import { InvoiceDetailModal } from '../../components/invoices/InvoiceDetailModal';
import { RecordPaymentModal } from '../../components/invoices/RecordPaymentModal';

export const SalesPage: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<
    'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month'
  >('all');
  const [sortBy, setSortBy] = useState<'order_date' | 'total_amount' | 'order_number'>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isCreateSaleOpen, setIsCreateSaleOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  // Linked invoice inspection modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);

  // Payment modal triggered from linked invoice
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const bundle = await fetchBusinessRecords();
      setOrders(bundle.orders);
      setOrderItems(bundle.orderItems || []);
      setCustomers(bundle.customers);
      setProducts(bundle.products);
      setInvoices(bundle.invoices);
      setPayments(bundle.payments || []);
    } catch (err) {
      console.error('Error loading sales ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute date range boundary for preset
  const dateRangeBounds = useMemo(() => {
    if (dateRangePreset === 'all') return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (dateRangePreset === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (dateRangePreset === 'last_7_days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().slice(0, 10), endDate: todayStr };
    }
    if (dateRangePreset === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString().slice(0, 10), endDate: todayStr };
    }
    if (dateRangePreset === 'this_month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: d.toISOString().slice(0, 10), endDate: todayStr };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateRangePreset]);

  // Real-time authoritative dashboard metrics computed from verified records
  const dashboardMetrics = useMemo(() => {
    return calculateSalesDashboardMetrics(orders, invoices, payments, {
      startDate: dateRangeBounds.startDate,
      endDate: dateRangeBounds.endDate,
    });
  }, [orders, invoices, payments, dateRangeBounds]);

  // Customer lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let result = filterAndSortOrders(orders, {
      search: searchQuery,
      status: statusFilter,
      customerMap,
      startDate: dateRangeBounds.startDate,
      endDate: dateRangeBounds.endDate,
      sortBy,
      sortDirection,
    });

    if (paymentStatusFilter !== 'all') {
      result = result.filter((o) => (o.payment_status || 'unpaid') === paymentStatusFilter);
    }

    return result;
  }, [
    orders,
    searchQuery,
    statusFilter,
    paymentStatusFilter,
    customerMap,
    dateRangeBounds,
    sortBy,
    sortDirection,
  ]);

  // Paginated orders
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const handleOpenOrderDetail = (order: SalesOrder) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const handleOpenLinkedInvoice = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      setSelectedInvoice(inv);
      setIsInvoiceDetailOpen(true);
    }
  };

  const handleOpenPaymentFromInvoice = (inv: Invoice) => {
    setIsInvoiceDetailOpen(false);
    setPaymentTargetInvoice(inv);
    setIsRecordPaymentOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-100">Sales & Orders</h2>
            <Badge variant="cherry" size="sm">Commercial Hub</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Authoritative order commitments, atomic inventory deduction, and receivables tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            aria-label="Refresh sales data"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateSaleOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Sale
          </Button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-2 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Calendar className="w-4 h-4 text-rose-400" />
          <span className="font-semibold text-zinc-300">Period:</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(
            [
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'last_7_days', label: 'Last 7 Days' },
              { id: 'last_30_days', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setDateRangePreset(preset.id);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                dateRangePreset === preset.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Authoritative Financial KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Sales</span>
              <TrendingUp className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {formatCurrency(dashboardMetrics.totalSales)}
            </div>
            <p className="text-[10px] text-zinc-500">
              {dashboardMetrics.confirmedOrdersCount} confirmed / fulfilled order{dashboardMetrics.confirmedOrdersCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {dashboardMetrics.totalOrdersCount}
            </div>
            <p className="text-[10px] text-zinc-500">
              {dashboardMetrics.draftOrdersCount} draft · {dashboardMetrics.cancelledOrdersCount} cancelled
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Invoices</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {dashboardMetrics.pendingInvoicesCount}
            </div>
            <p className="text-[10px] text-zinc-500">Awaiting customer payment</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Paid Invoices</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {dashboardMetrics.paidInvoicesCount}
            </div>
            <p className="text-[10px] text-zinc-500">
              {formatCurrency(dashboardMetrics.totalCollectedRevenue)} collected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding Balance</span>
              <DollarSign className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-400">
              {formatCurrency(dashboardMetrics.outstandingInvoiceBalance)}
            </div>
            <p className="text-[10px] text-zinc-500">Open accounts receivable</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Input
            placeholder="Search orders by number, customer, or notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by order lifecycle status"
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">All Order Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed / Fulfilled</option>
            <option value="draft">Draft (No Stock Deducted)</option>
            <option value="cancelled">Cancelled (Compensated)</option>
          </select>
        </div>

        <div>
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by payment status"
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Sales Orders Table View */}
      {loading ? (
        <LoadingState label="Loading sales orders and transactional ledger..." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={searchQuery || statusFilter !== 'all' ? 'No matching sales orders' : 'No sales orders created yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Adjust your query, date range, or status filter.'
              : 'Your sales ledger is empty. Create your first sale to book orders and automate inventory deduction.'
          }
          icon={<ShoppingBag className="w-6 h-6 text-zinc-400" />}
          actionLabel="Create Sales Order"
          onAction={() => setIsCreateSaleOpen(true)}
        />
      ) : (
        <Card className="border-zinc-800">
          <CardHeader className="py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Sales Orders Ledger</CardTitle>
                <CardDescription>
                  Showing {paginatedOrders.length} of {filteredOrders.length} record
                  {filteredOrders.length === 1 ? '' : 's'} · Verified isolation
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3 text-rose-400" />
                  <span>Sort {sortDirection.toUpperCase()}</span>
                </button>
                <Badge variant="outline" size="sm">
                  Table: public.sales_orders
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Order Number</th>
                  <th className="px-4 py-3 font-medium">Customer Account</th>
                  <th className="px-4 py-3 font-medium">Order Date</th>
                  <th className="px-4 py-3 font-medium">Order Status</th>
                  <th className="px-4 py-3 font-medium">Payment Status</th>
                  <th className="px-4 py-3 font-medium">Subtotal</th>
                  <th className="px-4 py-3 font-medium text-right">Total Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-400">
                {paginatedOrders.map((order) => {
                  const cust = customerMap.get(order.customer_id);
                  const custName = cust?.name || cust?.company_name || 'Account Client';
                  const custEmail = cust?.email;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                      onClick={() => handleOpenOrderDetail(order)}
                    >
                      <td className="px-4 py-3.5 text-rose-400 font-semibold font-mono">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <div className="font-medium text-zinc-200">{custName}</div>
                        {custEmail && <div className="text-[11px] text-zinc-500">{custEmail}</div>}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        {formatDate(order.order_date || order.created_at)}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <Badge variant={getStatusBadgeVariant(order.status)} size="sm">
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <Badge
                          variant={
                            order.payment_status === 'paid'
                              ? 'success'
                              : order.payment_status === 'partially_paid'
                              ? 'warning'
                              : 'outline'
                          }
                          size="sm"
                        >
                          {order.payment_status || 'unpaid'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        {formatCurrency(order.subtotal || order.total_amount * 0.9)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans text-zinc-100 font-bold">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-right font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {order.invoice_id && (
                            <button
                              type="button"
                              onClick={() => handleOpenLinkedInvoice(order.invoice_id!)}
                              title="View Linked Invoice"
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenOrderDetail(order)}
                            title="Manage Order"
                            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create Sale Modal */}
      <CreateSaleModal
        isOpen={isCreateSaleOpen}
        onClose={() => setIsCreateSaleOpen(false)}
        customers={customers}
        products={products}
        onOrderCreated={() => {
          loadData();
        }}
      />

      {/* Order Detail & Lifecycle Transition Modal */}
      <OrderDetailModal
        isOpen={isOrderDetailOpen}
        onClose={() => {
          setIsOrderDetailOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        items={orderItems.filter((i) => i.order_id === selectedOrder?.id)}
        customer={selectedOrder ? customerMap.get(selectedOrder.customer_id) : undefined}
        onOrderUpdated={() => {
          loadData();
        }}
        onViewInvoice={(invoiceId) => {
          setIsOrderDetailOpen(false);
          handleOpenLinkedInvoice(invoiceId);
        }}
      />

      {/* Linked Invoice Detail Modal with Print Layout */}
      <InvoiceDetailModal
        isOpen={isInvoiceDetailOpen}
        onClose={() => {
          setIsInvoiceDetailOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        items={orderItems.filter((i) => i.order_id === selectedInvoice?.id || i.order_id === selectedInvoice?.sales_order_id)}
        payments={payments}
        customer={selectedInvoice ? customerMap.get(selectedInvoice.customer_id) : undefined}
        onOpenRecordPayment={handleOpenPaymentFromInvoice}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setPaymentTargetInvoice(null);
        }}
        invoice={paymentTargetInvoice}
        customer={paymentTargetInvoice ? customerMap.get(paymentTargetInvoice.customer_id) : undefined}
        payments={payments}
        onPaymentRecorded={() => {
          loadData();
        }}
      />
    </div>
  );
};
