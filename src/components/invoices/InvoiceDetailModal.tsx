/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Printer,
  CreditCard,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Download,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Invoice, SalesOrderItem, Payment, Customer } from '../../types/database';
import { formatCurrency, formatDate, getStatusBadgeVariant } from '../../utils/formatters';
import { calculateInvoicePaymentState } from '../../utils/sales';
import { siteConfig } from '../../config/site';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  items: SalesOrderItem[];
  payments: Payment[];
  customer?: Customer;
  onOpenRecordPayment: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  items,
  payments,
  customer,
  onOpenRecordPayment,
}) => {
  if (!isOpen || !invoice) return null;

  const paymentState = calculateInvoicePaymentState(invoice, payments);
  const invoicePayments = payments.filter((p) => p.invoice_id === invoice.id && p.status !== 'reversed');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Action Toolbar (Hidden during print) */}
        <div className="print:hidden px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="invoice-detail-title" className="text-base font-bold text-zinc-100">
                  {invoice.invoice_number}
                </h2>
                <Badge variant={getStatusBadgeVariant(invoice.status)} size="sm">
                  {invoice.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">Commercial Billing Statement</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print / Save PDF
            </Button>
            {paymentState.outstandingBalance > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenRecordPayment(invoice)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Record Payment
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-6 sm:p-8 space-y-6 bg-zinc-900 print:bg-white print:text-zinc-900 print:p-0 print:border-none">
          {/* Header & Logo */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-zinc-800 print:border-zinc-300">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold text-sm">
                  C
                </div>
                <h1 className="text-xl font-extrabold text-zinc-100 print:text-zinc-900 tracking-tight">
                  {siteConfig.name}
                </h1>
              </div>
              <p className="text-xs text-zinc-400 print:text-zinc-600 mt-1">
                {siteConfig.tagline}
              </p>
              <p className="text-[11px] text-zinc-500 print:text-zinc-500 mt-0.5">
                Engineered by Nithiarasu (nithiarasu248@gmail.com)
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 text-xs">
              <h2 className="text-lg font-black text-rose-400 print:text-zinc-900 uppercase tracking-wider">
                INVOICE
              </h2>
              <p className="font-mono text-zinc-200 print:text-zinc-800 font-bold">{invoice.invoice_number}</p>
              <p className="text-zinc-400 print:text-zinc-600">
                Issue Date: <span className="font-mono text-zinc-200 print:text-zinc-800">{formatDate(invoice.issue_date)}</span>
              </p>
              <p className="text-zinc-400 print:text-zinc-600">
                Payment Due: <span className="font-mono text-zinc-200 print:text-zinc-800">{formatDate(invoice.due_date)}</span>
              </p>
            </div>
          </div>

          {/* Billed To & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-zinc-950/80 print:bg-zinc-100/50 border border-zinc-800 print:border-zinc-300 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 print:text-zinc-600 block mb-1">
                Billed To
              </span>
              <p className="text-sm font-bold text-zinc-200 print:text-zinc-900">
                {customer?.name || invoice.customer?.name || 'Commercial Customer'}
              </p>
              {customer?.company_name && (
                <p className="text-zinc-400 print:text-zinc-700">{customer.company_name}</p>
              )}
              {customer?.billing_address && (
                <p className="text-zinc-400 print:text-zinc-700 mt-0.5">{customer.billing_address}</p>
              )}
              {customer?.email && (
                <p className="text-zinc-500 print:text-zinc-600 font-mono mt-0.5">{customer.email}</p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 print:text-zinc-600 block mb-1">
                Payment Status
              </span>
              <div>
                <Badge
                  variant={
                    paymentState.paymentStatus === 'paid'
                      ? 'success'
                      : paymentState.isOverdue
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                >
                  {paymentState.paymentStatus === 'paid'
                    ? 'Fully Settled'
                    : paymentState.isOverdue
                    ? 'Overdue Receivable'
                    : 'Awaiting Settlement'}
                </Badge>
              </div>
              <p className="text-zinc-400 print:text-zinc-600 mt-1">
                Remaining Balance:{' '}
                <strong className="text-rose-400 print:text-rose-600 font-mono text-sm">
                  {formatCurrency(paymentState.outstandingBalance)}
                </strong>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-zinc-800 print:border-zinc-300 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950 print:bg-zinc-100 border-b border-zinc-800 print:border-zinc-300 text-[10px] font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700">
                  <th className="py-2.5 px-4">Item Description</th>
                  <th className="py-2.5 px-4 text-center w-20">Qty</th>
                  <th className="py-2.5 px-4 text-right w-28">Unit Price</th>
                  <th className="py-2.5 px-4 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 print:divide-zinc-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-4 text-center text-zinc-500">
                      Standard commercial invoice billing line.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-zinc-200 print:text-zinc-900">
                          {item.product_name_snapshot}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-500">{item.sku_snapshot}</p>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-zinc-300 print:text-zinc-800">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-zinc-300 print:text-zinc-800">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-zinc-100 print:text-zinc-900">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="p-4 bg-zinc-950/60 print:bg-zinc-50 border-t border-zinc-800 print:border-zinc-300 flex flex-col items-end space-y-1.5 text-xs">
              <div className="flex justify-between w-56 text-zinc-400 print:text-zinc-700">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-200 print:text-zinc-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount && invoice.discount_amount > 0 && (
                <div className="flex justify-between w-56 text-emerald-400 print:text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between w-56 text-zinc-400 print:text-zinc-700">
                  <span>Sales Tax:</span>
                  <span className="font-mono text-zinc-200 print:text-zinc-900">{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between w-56 pt-2 border-t border-zinc-800 print:border-zinc-300 text-sm font-bold text-zinc-100 print:text-zinc-900">
                <span>Total Due:</span>
                <span className="font-mono text-rose-400 print:text-rose-700">{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between w-56 text-emerald-400 print:text-emerald-700">
                <span>Amount Collected:</span>
                <span className="font-mono">-{formatCurrency(paymentState.amountPaid)}</span>
              </div>
              <div className="flex justify-between w-56 pt-1 border-t border-zinc-800/80 font-bold text-sm">
                <span className="text-zinc-300 print:text-zinc-800">Remaining Balance:</span>
                <span className="font-mono text-rose-400 print:text-rose-600">
                  {formatCurrency(paymentState.outstandingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Receipts Ledger */}
          {invoicePayments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-400 print:text-zinc-700 uppercase tracking-wider">
                Recorded Payments ({invoicePayments.length})
              </h3>
              <div className="border border-zinc-800 print:border-zinc-300 rounded-xl overflow-hidden bg-zinc-950/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-500 border-b border-zinc-800 text-[10px] uppercase tracking-wider">
                      <th className="py-2 px-3">Receipt #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                    {invoicePayments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 text-zinc-300 print:text-zinc-800">{p.payment_number}</td>
                        <td className="py-2 px-3 text-zinc-400 print:text-zinc-600">{formatDate(p.payment_date)}</td>
                        <td className="py-2 px-3 text-zinc-300 print:text-zinc-800 capitalize">{p.payment_method}</td>
                        <td className="py-2 px-3 text-zinc-400 print:text-zinc-600">{p.reference || '—'}</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="p-3 rounded-xl bg-zinc-950/60 print:bg-zinc-100 border border-zinc-800 print:border-zinc-300 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                Billing Notes & Terms
              </span>
              <p className="text-zinc-300 print:text-zinc-700">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="print:hidden px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400">
          <span>Cherryflow Unified Accounting Engine</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
