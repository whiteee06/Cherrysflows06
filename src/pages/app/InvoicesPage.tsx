/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  CreditCard,
  Printer,
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
import { Invoice, SalesOrderItem, Payment, Customer, Product } from '../../types/database';
import { formatCurrency, formatDate, getStatusBadgeVariant } from '../../utils/formatters';
import { calculateInvoicePaymentState, filterAndSortInvoices } from '../../utils/sales';
import { CreateInvoiceModal } from '../../components/invoices/CreateInvoiceModal';
import { InvoiceDetailModal } from '../../components/invoices/InvoiceDetailModal';
import { RecordPaymentModal } from '../../components/invoices/RecordPaymentModal';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'issue_date' | 'due_date' | 'total_amount' | 'invoice_number'>('issue_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const bundle = await fetchBusinessRecords();
      setInvoices(bundle.invoices);
      setOrderItems(bundle.orderItems || []);
      setPayments(bundle.payments || []);
      setCustomers(bundle.customers);
      setProducts(bundle.products);
    } catch (err) {
      console.error('Error loading invoices & receivables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Aggregate invoice metrics calculated directly from records
  const invoiceMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueBalance = 0;
    let paidCount = 0;
    let issuedCount = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    for (const inv of invoices) {
      if (inv.status === 'draft') continue;
      const state = calculateInvoicePaymentState(inv, payments);
      totalInvoiced += inv.total_amount;
      totalPaid += state.amountPaid;
      totalOutstanding += state.outstandingBalance;

      if (state.isPaid) {
        paidCount++;
      } else {
        issuedCount++;
        if (state.isOverdue) {
          overdueCount++;
          overdueBalance += state.outstandingBalance;
        }
      }
    }

    return {
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      overdueCount,
      overdueBalance: Math.round(overdueBalance * 100) / 100,
      paidCount,
      issuedCount,
    };
  }, [invoices, payments]);

  // Filtered and sorted invoices
  const filteredInvoices = useMemo(() => {
    return filterAndSortInvoices(invoices, {
      search: searchQuery,
      status: statusFilter,
      customerMap,
      sortBy,
      sortDirection,
    });
  }, [invoices, searchQuery, statusFilter, customerMap, sortBy, sortDirection]);

  // Paginated invoices
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const handleOpenDetail = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsInvoiceDetailOpen(true);
  };

  const handleOpenPayment = (inv: Invoice) => {
    setPaymentTargetInvoice(inv);
    setIsRecordPaymentOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-100">Invoices & Billing</h2>
            <Badge variant="cherry" size="sm">Accounts Receivable</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Generate printable invoices, record itemized payments, and prevent overpayments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            aria-label="Refresh invoices"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateInvoiceOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Draft Invoice
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Invoiced</span>
              <Receipt className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {formatCurrency(invoiceMetrics.totalInvoiced)}
            </div>
            <p className="text-[10px] text-zinc-500">
              {invoices.length} commercial invoice{invoices.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Collected Revenue</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatCurrency(invoiceMetrics.totalPaid)}
            </div>
            <p className="text-[10px] text-zinc-500">
              {invoiceMetrics.paidCount} fully settled invoice{invoiceMetrics.paidCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding Balance</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {formatCurrency(invoiceMetrics.totalOutstanding)}
            </div>
            <p className="text-[10px] text-zinc-500">
              {invoiceMetrics.issuedCount} pending collection
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue Balance</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-400">
              {formatCurrency(invoiceMetrics.overdueBalance)}
            </div>
            <p className="text-[10px] text-zinc-500">
              {invoiceMetrics.overdueCount} invoice{invoiceMetrics.overdueCount === 1 ? '' : 's'} past due date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search invoices by number, client, or notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter by invoice status"
          className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
        >
          <option value="all">All Invoice Statuses</option>
          <option value="issued">Issued / Unpaid</option>
          <option value="paid">Paid in Full</option>
          <option value="overdue">Overdue</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <LoadingState label="Loading commercial invoices and receivables..." />
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          title={searchQuery || statusFilter !== 'all' ? 'No matching invoices' : 'No invoices generated yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try modifying your search query or status filter.'
              : 'Your receivables ledger is currently empty. Draft an invoice to bill a client.'
          }
          icon={<Receipt className="w-6 h-6 text-zinc-400" />}
          actionLabel="Draft Invoice"
          onAction={() => setIsCreateInvoiceOpen(true)}
        />
      ) : (
        <Card className="border-zinc-800">
          <CardHeader className="py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Accounts Receivable Ledger</CardTitle>
                <CardDescription>
                  Showing {paginatedInvoices.length} of {filteredInvoices.length} invoice
                  {filteredInvoices.length === 1 ? '' : 's'} · Verified isolation
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3 text-rose-400" />
                  <span>Sort {sortDirection.toUpperCase()}</span>
                </button>
                <Badge variant="outline" size="sm">
                  Table: public.invoices
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice Number</th>
                  <th className="px-4 py-3 font-medium">Customer Account</th>
                  <th className="px-4 py-3 font-medium">Issue Date</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Amount Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Balance Due</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-400">
                {paginatedInvoices.map((inv) => {
                  const cust = customerMap.get(inv.customer_id);
                  const custName = cust?.name || cust?.company_name || 'Billing Client';
                  const pState = calculateInvoicePaymentState(inv, payments);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                      onClick={() => handleOpenDetail(inv)}
                    >
                      <td className="px-4 py-3.5 text-rose-400 font-semibold font-mono">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <div className="font-medium text-zinc-200">{custName}</div>
                        {cust?.email && <div className="text-[11px] text-zinc-500">{cust.email}</div>}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        {formatDate(inv.issue_date || inv.created_at)}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span>{formatDate(inv.due_date)}</span>
                          {pState.isOverdue && (
                            <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                              (Overdue)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <Badge
                          variant={
                            pState.isPaid
                              ? 'success'
                              : pState.isOverdue
                              ? 'danger'
                              : getStatusBadgeVariant(inv.status)
                          }
                          size="sm"
                        >
                          {pState.isOverdue ? 'overdue' : pState.isPaid ? 'paid' : inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans text-zinc-100 font-bold">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans text-emerald-400">
                        {formatCurrency(pState.amountPaid)}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right font-sans font-bold ${
                          pState.outstandingBalance > 0 ? 'text-rose-400' : 'text-zinc-500'
                        }`}
                      >
                        {formatCurrency(pState.outstandingBalance)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-right font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {pState.outstandingBalance > 0 && inv.status !== 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(inv)}
                              title="Record Payment"
                              className="px-2 py-1 rounded bg-rose-600/20 border border-rose-500/40 text-[11px] text-rose-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(inv)}
                            title="View & Print Invoice"
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

      {/* Direct Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        customers={customers}
        products={products}
        onInvoiceCreated={() => {
          loadData();
        }}
      />

      {/* Printable Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={isInvoiceDetailOpen}
        onClose={() => {
          setIsInvoiceDetailOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        items={orderItems.filter(
          (i) => i.order_id === selectedInvoice?.id || i.order_id === selectedInvoice?.sales_order_id
        )}
        payments={payments}
        customer={selectedInvoice ? customerMap.get(selectedInvoice.customer_id) : undefined}
        onOpenRecordPayment={(inv) => {
          setIsInvoiceDetailOpen(false);
          handleOpenPayment(inv);
        }}
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
