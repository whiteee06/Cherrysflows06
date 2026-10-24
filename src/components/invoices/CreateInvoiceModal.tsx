/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Receipt,
  DollarSign,
  Calendar,
  Building,
  Package,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Customer, Product } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { calculateLineItem, calculateOrderTotals } from '../../utils/sales';
import { createDirectInvoice, CreateOrderLineItemInput } from '../../services/business/records';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onInvoiceCreated: () => void;
}

interface FormLineItem {
  id: string;
  productId: string;
  quantity: number;
  discountAmount: number;
  taxRatePercent: number;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onInvoiceCreated,
}) => {
  const [customerId, setCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [orderTaxPercent, setOrderTaxPercent] = useState<string>('0');
  const [notes, setNotes] = useState('Payment is due within payment terms. Please reference invoice number with payment.');

  const [items, setItems] = useState<FormLineItem[]>([
    {
      id: 'item_init_1',
      productId: '',
      quantity: 1,
      discountAmount: 0,
      taxRatePercent: 0,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick terms setter
  const setPaymentTerms = (days: number) => {
    const d = new Date(issueDate || Date.now());
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0, 10));
  };

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const lineCalculations = useMemo(() => {
    return items.map((item) => {
      const prod = productMap.get(item.productId);
      const unitPrice = prod?.selling_price || 0;
      const calc = calculateLineItem({
        quantity: item.quantity,
        unitPrice,
        discountAmount: item.discountAmount,
        taxRatePercent: item.taxRatePercent,
      });
      return {
        ...calc,
        unitPrice,
        product: prod,
        quantity: item.quantity,
      };
    });
  }, [items, productMap]);

  const orderTotals = useMemo(() => {
    const virtualItems = lineCalculations.map((lc) => ({
      quantity: lc.quantity,
      unitPrice: lc.unitPrice,
      discountAmount: lc.discountAmount,
      taxAmount: lc.taxAmount,
      lineTotal: lc.lineTotal,
    }));
    return calculateOrderTotals(
      virtualItems,
      parseFloat(orderDiscount) || 0,
      parseFloat(orderTaxPercent) || 0
    );
  }, [lineCalculations, orderDiscount, orderTaxPercent]);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: '',
        quantity: 1,
        discountAmount: 0,
        taxRatePercent: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemRow = (index: number, updates: Partial<FormLineItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerId) {
      setErrorMessage('Please select a customer account for this invoice.');
      return;
    }

    if (!dueDate) {
      setErrorMessage('Please select a payment due date.');
      return;
    }

    const validItems: CreateOrderLineItemInput[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        setErrorMessage(`Please select a product for line item #${i + 1}.`);
        return;
      }
      if (item.quantity <= 0) {
        setErrorMessage(`Quantity for line item #${i + 1} must be at least 1.`);
        return;
      }
      validItems.push({
        productId: item.productId,
        quantity: item.quantity,
        discountAmount: Math.max(0, item.discountAmount || 0),
        taxRatePercent: Math.max(0, item.taxRatePercent || 0),
      });
    }

    if (validItems.length === 0) {
      setErrorMessage('Please add at least one line item to the invoice.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDirectInvoice({
        customerId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        issueDate,
        dueDate,
        items: validItems,
        orderDiscount: parseFloat(orderDiscount) || 0,
        orderTaxPercent: parseFloat(orderTaxPercent) || 0,
        notes: notes.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to issue invoice.');
        return;
      }

      onInvoiceCreated();
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-invoice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-invoice-title" className="text-base sm:text-lg font-bold text-zinc-100">
                Draft Commercial Invoice
              </h2>
              <p className="text-xs text-zinc-400">
                Issue an accounts receivable invoice with itemized line items and payment terms.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Customer & Term Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Customer / Client <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  >
                    <option value="">Select Customer Account...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company_name ? `(${c.company_name})` : ''} - {c.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCustomer && (
                <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                    <Building className="w-3.5 h-3.5 text-rose-400" />
                    <span>{selectedCustomer.company_name || selectedCustomer.name}</span>
                  </div>
                  <p>Billing Email: {selectedCustomer.email || 'No email provided'}</p>
                  <p>Phone: {selectedCustomer.phone || 'No phone'}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Invoice Number"
                  placeholder="Auto-assigned (e.g. INV-2026-101)"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
                <Input
                  label="Issue Date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">
                    Payment Due Date <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPaymentTerms(0)}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                    >
                      Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTerms(15)}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                    >
                      Net 15
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTerms(30)}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                    >
                      Net 30
                    </button>
                  </div>
                </div>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Itemized Line Items
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Select catalog products to pull authoritative pricing.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItemRow}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line Item
              </Button>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Product / Service</th>
                    <th className="px-3 py-2.5 font-medium w-20">Qty</th>
                    <th className="px-3 py-2.5 font-medium w-24">Unit Price</th>
                    <th className="px-3 py-2.5 font-medium w-24">Discount ($)</th>
                    <th className="px-3 py-2.5 font-medium w-24">Tax (%)</th>
                    <th className="px-3 py-2.5 font-medium w-24 text-right">Line Total</th>
                    <th className="px-2 py-2.5 font-medium w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {items.map((item, idx) => {
                    const calc = lineCalculations[idx];
                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/20">
                        <td className="px-3 py-2">
                          <select
                            value={item.productId}
                            onChange={(e) => updateItemRow(idx, { productId: e.target.value })}
                            required
                            className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                          >
                            <option value="">Select a product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — {formatCurrency(p.selling_price)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemRow(idx, {
                                quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            required
                            className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-400">
                          {formatCurrency(calc?.unitPrice || 0)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discountAmount}
                            onChange={(e) =>
                              updateItemRow(idx, {
                                discountAmount: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 text-right focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.taxRatePercent}
                            onChange={(e) =>
                              updateItemRow(idx, {
                                taxRatePercent: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 text-right focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-200 font-semibold">
                          {formatCurrency(calc?.lineTotal || 0)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="p-1 text-zinc-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Order Adjustments & Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Payment Terms & Remittance Notes
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bank wire instructions, ACH info, payment terms..."
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none font-sans"
              />
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono text-zinc-200">{formatCurrency(orderTotals.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  Global Discount ($)
                </span>
                <div className="w-24">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderDiscount}
                    onChange={(e) => setOrderDiscount(e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-right text-rose-400 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  Tax Rate (%)
                </span>
                <div className="w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={orderTaxPercent}
                    onChange={(e) => setOrderTaxPercent(e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-right text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Total Tax Amount</span>
                <span className="font-mono text-zinc-200">{formatCurrency(orderTotals.taxAmount)}</span>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-sm font-bold text-zinc-100">
                <span>Total Payable</span>
                <span className="font-mono text-base text-rose-400">
                  {formatCurrency(orderTotals.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Receipt className="w-4 h-4" />}
            >
              Issue Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
