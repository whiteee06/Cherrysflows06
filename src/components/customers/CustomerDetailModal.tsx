/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ShoppingBag,
  Receipt,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Customer, SalesOrder, Invoice } from '../../types/database';
import { formatCurrency, formatDate, getStatusBadgeVariant } from '../../utils/formatters';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  orders: SalesOrder[];
  invoices: Invoice[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  orders,
  invoices,
  onEdit,
  onDelete,
}) => {
  if (!customer) return null;

  // Compute customer-specific financial summary
  const customerOrders = useMemo(() => {
    return orders.filter((o) => o.customer_id === customer.id);
  }, [orders, customer.id]);

  const customerInvoices = useMemo(() => {
    return invoices.filter((i) => i.customer_id === customer.id);
  }, [invoices, customer.id]);

  const totalSpent = useMemo(() => {
    return customerOrders
      .filter((o) => o.status === 'confirmed' || o.status === 'fulfilled')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [customerOrders]);

  const outstandingBalance = useMemo(() => {
    return customerInvoices
      .filter((i) => i.status === 'issued' || i.status === 'overdue')
      .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);
  }, [customerInvoices]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      description={customer.company_name ? `Commercial Account: ${customer.company_name}` : 'Individual Buyer Account'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-700 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">{customer.name}</h3>
                <Badge variant={customer.status === 'active' ? 'success' : 'muted'} size="sm">
                  {customer.status === 'active' ? 'Active Account' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {customer.company_name || 'Individual Commercial Contact'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(customer);
              }}
              leftIcon={<Edit className="w-3.5 h-3.5 text-zinc-300" />}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClose();
                onDelete(customer);
              }}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Total Realized Volume</span>
            <span className="text-lg font-bold text-zinc-100 mt-1 block">{formatCurrency(totalSpent)}</span>
            <span className="text-[11px] text-zinc-500">{customerOrders.length} order{customerOrders.length === 1 ? '' : 's'} placed</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Outstanding Balance</span>
            <span className={`text-lg font-bold mt-1 block ${outstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatCurrency(outstandingBalance)}
            </span>
            <span className="text-[11px] text-zinc-500">
              {outstandingBalance > 0 ? 'Pending collection' : 'All accounts settled'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Invoices Billed</span>
            <span className="text-lg font-bold text-zinc-100 mt-1 block">{customerInvoices.length}</span>
            <span className="text-[11px] text-zinc-500">Commercial billing records</span>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <h4 className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-rose-500" />
              Contact Information
            </h4>

            <div className="space-y-2 text-zinc-300">
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Email:</span>
                <span className="font-mono">{customer.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Phone:</span>
                <span>{customer.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">City / Region:</span>
                <span>{customer.city || '—'}</span>
              </div>
              <div className="py-1">
                <span className="text-zinc-500 block mb-0.5">Billing Address:</span>
                <span className="text-zinc-300">{customer.address || customer.billing_address || '—'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <h4 className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              Audit & Notes
            </h4>

            <div className="space-y-2 text-zinc-300">
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Customer ID:</span>
                <span className="font-mono text-[10px] text-zinc-400">{customer.id}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Registered On:</span>
                <span>{customer.created_at ? formatDate(customer.created_at) : '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Last Updated:</span>
                <span>{customer.updated_at ? formatDate(customer.updated_at) : '—'}</span>
              </div>
              <div className="py-1">
                <span className="text-zinc-500 block mb-0.5">Notes / Terms:</span>
                <span className="text-zinc-300 italic">{customer.notes || 'No notes recorded.'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Transactions Tabs */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
            Transaction History ({customerOrders.length} Orders, {customerInvoices.length} Invoices)
          </h4>

          {customerOrders.length === 0 && customerInvoices.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center text-xs text-zinc-400">
              No sales orders or invoices recorded yet for this customer.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                  {customerOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] text-zinc-400">Order</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-200 font-semibold">{o.order_number}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{formatDate(o.order_date || o.created_at)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-zinc-100">{formatCurrency(o.total_amount)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge variant={getStatusBadgeVariant(o.status)} size="sm">
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {customerInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] text-zinc-400">Invoice</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-200 font-semibold">{inv.invoice_number}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{formatDate(inv.issue_date || inv.created_at)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-zinc-100">{formatCurrency(inv.total_amount)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
