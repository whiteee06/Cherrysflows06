/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileCode2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/StateViewer';
import { Customer, SalesOrder, Invoice } from '../../types/database';
import { fetchBusinessRecords } from '../../services/business/records';
import { CHERRYFLOW_SCHEMA_TABLES } from '../../services/supabase/schema';
import { formatDate } from '../../utils/formatters';
import {
  CustomerSortOption,
  CustomerStatusFilter,
  filterAndSortCustomers,
  calculateCustomerStats,
} from '../../utils/customer';
import { CustomerModal } from '../../components/customers/CustomerModal';
import { CustomerDetailModal } from '../../components/customers/CustomerDetailModal';
import { CustomerDeleteDialog } from '../../components/customers/CustomerDeleteDialog';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('all');
  const [sortOption, setSortOption] = useState<CustomerSortOption>('name_asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const customerTableSchema = CHERRYFLOW_SCHEMA_TABLES.find((t) => t.tableName === 'customers');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const bundle = await fetchBusinessRecords();
      setCustomers(bundle.customers);
      setOrders(bundle.orders);
      setInvoices(bundle.invoices);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve customer accounts';
      setErrorMessage(msg);
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived customer statistics from actual records
  const stats = useMemo(() => {
    return calculateCustomerStats(customers);
  }, [customers]);

  // Filtered and sorted customer accounts
  const filteredCustomers = useMemo(() => {
    return filterAndSortCustomers(customers, searchQuery, statusFilter, sortOption);
  }, [customers, searchQuery, statusFilter, sortOption]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortOption]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/50 text-emerald-300 text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 tracking-tight">
              Customer Accounts
            </h2>
            <Badge variant="cherry" size="sm">
              CRM Active
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Directory of buyers, commercial clients, and billing accounts with database persistence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Refresh customer list"
            title="Refresh database records"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCustomerToEdit(null);
              setIsAddEditModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customer Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Customers</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-zinc-100 mt-2">{stats.total}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Verified database accounts</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Commercial Accounts</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2">{stats.active}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Eligible for sales orders & invoices</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Inactive / Archived</span>
            <span className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-zinc-400 mt-2">{stats.inactive}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Safely preserved historical records</p>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Search by customer name, company, email, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CustomerStatusFilter)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as CustomerSortOption)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorState
          title="Failed to Load Customers"
          message={errorMessage}
          onRetry={() => loadData()}
        />
      )}

      {/* Loading state skeleton */}
      {isLoading ? (
        <LoadingState message="Retrieving authorized customer directory from database..." />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          title={searchQuery || statusFilter !== 'all' ? 'No matching customers found' : 'No customers registered yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or resetting the status filter.'
              : 'Add your first customer to establish commercial accounts, issue invoices, and manage client orders.'
          }
          icon={<Users className="w-8 h-8 text-zinc-500" />}
          actionLabel="Add Customer"
          onAction={() => {
            setCustomerToEdit(null);
            setIsAddEditModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Responsive Customer Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-semibold tracking-wider uppercase text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Customer & Company</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Location</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 hidden lg:table-cell">Created</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/20">
                  {paginatedCustomers.map((cust) => {
                    return (
                      <tr key={cust.id} className="hover:bg-zinc-900/50 transition-colors group">
                        {/* Customer & Company */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-rose-400 font-bold text-xs shrink-0">
                              {cust.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setDetailCustomer(cust)}
                                className="font-bold text-zinc-100 hover:text-rose-400 truncate text-left block cursor-pointer transition-colors"
                              >
                                {cust.name}
                              </button>
                              {cust.company_name && (
                                <p className="text-[11px] text-zinc-400 truncate">{cust.company_name}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {cust.email && (
                              <div className="flex items-center gap-1.5 text-zinc-300">
                                <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                                <span className="truncate max-w-[180px] font-mono text-[11px]">{cust.email}</span>
                              </div>
                            )}
                            {cust.phone && (
                              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                                <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                                <span>{cust.phone}</span>
                              </div>
                            )}
                            {!cust.email && !cust.phone && (
                              <span className="text-zinc-500 text-[11px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-zinc-400 max-w-[200px] truncate">
                            <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{cust.city || cust.address || cust.billing_address || '—'}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <Badge
                            variant={cust.status === 'active' ? 'success' : 'muted'}
                            size="sm"
                          >
                            {cust.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>

                        {/* Created Date */}
                        <td className="py-3 px-4 hidden lg:table-cell text-zinc-400 font-mono text-[11px]">
                          {cust.created_at ? formatDate(cust.created_at) : '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailCustomer(cust)}
                              title="View Customer Details"
                              aria-label={`View details for ${cust.name}`}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCustomerToEdit(cust);
                                setIsAddEditModalOpen(true);
                              }}
                              title="Edit Customer"
                              aria-label={`Edit ${cust.name}`}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteCustomer(cust)}
                              title="Delete or Archive Customer"
                              aria-label={`Delete ${cust.name}`}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-500 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="py-3 px-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
              <div>
                Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</strong> of{' '}
                <strong>{filteredCustomers.length}</strong> customer{filteredCustomers.length === 1 ? '' : 's'}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>

                <span className="px-2 font-mono text-[11px] text-zinc-300">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Database Schema Reference Accordion */}
          {customerTableSchema && (
            <Card className="border-zinc-800/80 bg-zinc-950/60 mt-6">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-rose-500" />
                    <CardTitle className="text-xs font-semibold">
                      PostgreSQL Table Specification ({customerTableSchema.tableName})
                    </CardTitle>
                  </div>
                  <Badge variant="outline" size="sm" className="border-zinc-800 text-zinc-400">
                    Row Level Security Active
                  </Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Configured with authenticated tenant isolation, UUID foreign keys, and indexes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {customerTableSchema.columns.map((col) => (
                    <div key={col.name} className="p-2 rounded bg-zinc-900 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-zinc-200 font-semibold">{col.name}</span>
                        <span className="font-mono text-[10px] text-rose-400">{col.type}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">{col.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <CustomerModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        customerToEdit={customerToEdit}
        onSaved={() => {
          loadData(true);
          showToast(
            customerToEdit
              ? `Customer account "${customerToEdit.name}" updated successfully.`
              : 'New customer account registered successfully.'
          );
        }}
      />

      <CustomerDetailModal
        isOpen={Boolean(detailCustomer)}
        onClose={() => setDetailCustomer(null)}
        customer={detailCustomer}
        orders={orders}
        invoices={invoices}
        onEdit={(cust) => {
          setCustomerToEdit(cust);
          setIsAddEditModalOpen(true);
        }}
        onDelete={(cust) => {
          setDeleteCustomer(cust);
        }}
      />

      <CustomerDeleteDialog
        isOpen={Boolean(deleteCustomer)}
        onClose={() => setDeleteCustomer(null)}
        customer={deleteCustomer}
        onDeleted={() => {
          loadData(true);
          showToast(`Customer record updated/removed successfully.`);
        }}
      />
    </div>
  );
};
