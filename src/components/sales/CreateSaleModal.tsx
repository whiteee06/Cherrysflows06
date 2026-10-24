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
  ShoppingBag,
  DollarSign,
  User,
  Calendar,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Customer, Product, SalesOrderStatus } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import {
  calculateLineItem,
  calculateOrderTotals,
} from '../../utils/sales';
import {
  createSalesOrderWithInventoryDeduction,
  CreateOrderLineItemInput,
} from '../../services/business/records';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onOrderCreated: () => void;
}

interface FormLineItem {
  id: string;
  productId: string;
  quantity: number;
  discountAmount: number;
  taxRatePercent: number;
}

export const CreateSaleModal: React.FC<CreateSaleModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onOrderCreated,
}) => {
  const [customerId, setCustomerId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orderStatus, setOrderStatus] = useState<SalesOrderStatus>('confirmed');
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [orderTaxPercent, setOrderTaxPercent] = useState<string>('8'); // Standard 8% tax default
  const [notes, setNotes] = useState('');
  const [createInvoice, setCreateInvoice] = useState(true);

  // Line items
  const [items, setItems] = useState<FormLineItem[]>([
    {
      id: `item_${Date.now()}`,
      productId: products[0]?.id || '',
      quantity: 1,
      discountAmount: 0,
      taxRatePercent: 0,
    },
  ]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company_name && c.company_name.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Selected customer object
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  // Calculate live financial preview
  const liveFinancials = useMemo(() => {
    const calculatedItems = items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const unitPrice = prod ? prod.selling_price : 0;
      return {
        quantity: item.quantity,
        unitPrice,
        discountAmount: item.discountAmount,
        taxAmount: 0,
      };
    });

    const parsedDiscount = Math.max(0, parseFloat(orderDiscount) || 0);
    const parsedTax = Math.max(0, parseFloat(orderTaxPercent) || 0);

    return calculateOrderTotals(calculatedItems, parsedDiscount, parsedTax);
  }, [items, products, orderDiscount, orderTaxPercent]);

  // Add line item
  const handleAddItem = () => {
    const nextProduct = products.find((p) => !items.some((i) => i.productId === p.id)) || products[0];
    if (!nextProduct) return;
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: nextProduct.id,
        quantity: 1,
        discountAmount: 0,
        taxRatePercent: 0,
      },
    ]);
  };

  // Remove line item
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Update line item
  const handleUpdateItem = (id: string, updates: Partial<FormLineItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  // Submit order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerId) {
      setErrorMessage('Please select a customer for this sales order.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one product item to the order.');
      return;
    }

    // Check line quantities
    for (const item of items) {
      if (item.quantity <= 0) {
        setErrorMessage('All line item quantities must be at least 1 unit.');
        return;
      }
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        setErrorMessage('One or more selected products are invalid.');
        return;
      }
      if (
        (orderStatus === 'confirmed' || orderStatus === 'completed') &&
        prod.stock_quantity < item.quantity
      ) {
        setErrorMessage(
          `Insufficient stock for "${prod.name}" (${prod.sku}). On-hand stock is ${prod.stock_quantity}, but order requested ${item.quantity} units.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderItemsInput: CreateOrderLineItemInput[] = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        discountAmount: i.discountAmount,
        taxRatePercent: 0,
      }));

      const res = await createSalesOrderWithInventoryDeduction({
        customerId,
        orderNumber: orderNumber.trim() || undefined,
        orderDate,
        status: orderStatus,
        items: orderItemsInput,
        orderDiscount: parseFloat(orderDiscount) || 0,
        orderTaxPercent: parseFloat(orderTaxPercent) || 0,
        notes,
        createInvoice,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to record sales order.');
        return;
      }

      onOrderCreated();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-sale-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-sale-modal-title" className="text-base sm:text-lg font-bold text-zinc-100">
                Create Sales Order
              </h2>
              <p className="text-xs text-zinc-400">
                Authoritative pricing, atomic inventory deduction, and billing invoice generation.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Validation Notice</p>
                <p className="text-zinc-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Customer Account *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                  required
                >
                  <option value="">Select a registered customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Filter customers by name or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {selectedCustomer && (
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <User className="w-4 h-4 text-rose-400" />
                  <span>
                    <strong className="text-zinc-100">{selectedCustomer.name}</strong>
                    {selectedCustomer.email && ` • ${selectedCustomer.email}`}
                    {selectedCustomer.phone && ` • ${selectedCustomer.phone}`}
                  </span>
                </div>
                <Badge variant="outline" size="sm" className="text-zinc-400 border-zinc-800">
                  Verified Contact
                </Badge>
              </div>
            )}
          </div>

          {/* Order Parameters (Number, Date, Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Order Number
              </label>
              <Input
                placeholder="Auto-generated (SO-XXXX)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Order Date *
              </label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Commitment Status *
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as SalesOrderStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="confirmed">Confirmed (Deducts Stock)</option>
                <option value="completed">Completed (Fulfill & Deduct)</option>
                <option value="draft">Draft (Quote Only - No Stock Impact)</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Product Line Items ({items.length}) *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Item
              </Button>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/80 bg-zinc-950 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3 w-28 text-center">Stock Level</th>
                      <th className="py-2.5 px-3 w-24 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                      <th className="py-2.5 px-3 w-28 text-right">Line Total</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {items.map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const unitPrice = prod ? prod.selling_price : 0;
                      const lineCalc = calculateLineItem({
                        quantity: item.quantity,
                        unitPrice,
                        discountAmount: item.discountAmount,
                        taxRatePercent: 0,
                      });
                      const isStockShortage =
                        (orderStatus === 'confirmed' || orderStatus === 'completed') &&
                        prod &&
                        prod.stock_quantity < item.quantity;

                      return (
                        <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-2.5 px-3">
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { productId: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {prod ? (
                              <span
                                className={`font-mono text-xs ${
                                  isStockShortage
                                    ? 'text-rose-400 font-bold'
                                    : prod.stock_quantity <= prod.low_stock_threshold
                                    ? 'text-amber-400'
                                    : 'text-zinc-400'
                                }`}
                              >
                                {prod.stock_quantity} {prod.unit}
                                {isStockShortage && ' (Shortage!)'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className="w-16 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-center font-mono text-zinc-200 text-xs focus:outline-none focus:border-rose-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-100">
                            {formatCurrency(lineCalc.lineTotal)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={items.length <= 1}
                              aria-label="Remove item"
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
          </div>

          {/* Financial Calculation Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Order Level Discount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={orderTaxPercent}
                  onChange={(e) => setOrderTaxPercent(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
                  placeholder="8.0"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={createInvoice}
                    onChange={(e) => setCreateInvoice(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Automatically issue commercial invoice (Net-30)</span>
                </label>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Items Subtotal:</span>
                <span className="font-mono text-zinc-200">{formatCurrency(liveFinancials.subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Discount Applied:</span>
                <span className="font-mono text-emerald-400">
                  -{formatCurrency(liveFinancials.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Estimated Tax ({orderTaxPercent || 0}%):</span>
                <span className="font-mono text-zinc-200">{formatCurrency(liveFinancials.taxAmount)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-sm font-bold text-zinc-100">
                <span>Final Payable Total:</span>
                <span className="text-base font-extrabold text-rose-400 font-mono">
                  {formatCurrency(liveFinancials.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Order Notes & Fulfillment Terms
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Shipping instructions, PO references, or commercial terms..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
            />
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
              {orderStatus === 'confirmed'
                ? 'Confirm Order & Deduct Stock'
                : orderStatus === 'completed'
                ? 'Complete Order & Deduct Stock'
                : 'Save as Draft Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
