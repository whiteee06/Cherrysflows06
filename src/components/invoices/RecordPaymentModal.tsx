/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  Receipt,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Invoice, Payment, PaymentMethod, Customer } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { calculateInvoicePaymentState } from '../../utils/sales';
import { recordInvoicePayment } from '../../services/business/records';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  customer?: Customer;
  payments: Payment[];
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customer,
  payments,
  onPaymentRecorded,
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const paymentSummary = useMemo(() => {
    if (!invoice) return null;
    return calculateInvoicePaymentState(invoice, payments);
  }, [invoice, payments]);

  if (!isOpen || !invoice || !paymentSummary) return null;

  const parsedAmount = Math.max(0, parseFloat(amount) || 0);
  const remainingBalanceAfterPayment = Math.max(
    0,
    Math.round((paymentSummary.outstandingBalance - parsedAmount) * 100) / 100
  );
  const isOverpayment = parsedAmount > paymentSummary.outstandingBalance;

  const handlePayFull = () => {
    setAmount(paymentSummary.outstandingBalance.toFixed(2));
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (parsedAmount <= 0) {
      setErrorMessage('Please enter a positive payment amount.');
      return;
    }

    if (isOverpayment) {
      setErrorMessage(
        `Payment amount of ${formatCurrency(parsedAmount)} exceeds the outstanding invoice balance of ${formatCurrency(paymentSummary.outstandingBalance)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordInvoicePayment({
        invoiceId: invoice.id,
        amount: parsedAmount,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentDate,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to record payment');
        return;
      }

      onPaymentRecorded();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Payment recording failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="record-payment-title" className="text-base font-bold text-zinc-100">
                Record Invoice Payment
              </h2>
              <p className="text-xs text-zinc-400">
                Log authorized settlement receipt and update accounts receivable.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="text-zinc-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Invoice Summary Target */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-zinc-200">{invoice.invoice_number}</span>
              </div>
              <Badge variant="outline" size="sm" className="border-zinc-800 text-zinc-400">
                {customer?.name || invoice.customer?.name || 'Customer Account'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
              <div>
                <span>Total Invoiced:</span>{' '}
                <strong className="text-zinc-200 font-mono">{formatCurrency(invoice.total_amount)}</strong>
              </div>
              <div>
                <span>Current Balance:</span>{' '}
                <strong className="text-rose-400 font-mono font-bold">
                  {formatCurrency(paymentSummary.outstandingBalance)}
                </strong>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Payment Amount ($) *
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                Pay Full Balance ({formatCurrency(paymentSummary.outstandingBalance)})
              </button>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={paymentSummary.outstandingBalance}
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrorMessage(null);
              }}
              required
            />
          </div>

          {/* Live Balance Preview */}
          {parsedAmount > 0 && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Balance after payment:</span>
              <span
                className={`font-mono font-bold ${
                  remainingBalanceAfterPayment === 0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {remainingBalanceAfterPayment === 0
                  ? 'Settled in Full ($0.00)'
                  : formatCurrency(remainingBalanceAfterPayment)}
              </span>
            </div>
          )}

          {/* Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer / ACH Wire</option>
                <option value="cash">Cash Settlement</option>
                <option value="other">Check / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Receipt Date *
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Reference / Transaction Code
              </label>
              <Input
                placeholder="e.g. WIRE-98124, VISA-AUTH-4421, Check #1042"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Staff Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Settlement notes or receipt details..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
