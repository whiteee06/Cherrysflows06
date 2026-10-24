/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Calendar,
  User,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { SalesOrder, SalesOrderItem, Customer, SalesOrderStatus } from '../../types/database';
import { formatCurrency, formatDate, getStatusBadgeVariant } from '../../utils/formatters';
import {
  transitionSalesOrderStatus,
  deleteSalesOrderSafely,
} from '../../services/business/records';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
  items: SalesOrderItem[];
  customer?: Customer;
  onOrderUpdated: () => void;
  onViewInvoice?: (invoiceId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  items,
  customer,
  onOrderUpdated,
  onViewInvoice,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  if (!isOpen || !order) return null;

  const handleStatusTransition = async (targetStatus: SalesOrderStatus) => {
    setIsTransitioning(true);
    setErrorMessage(null);
    try {
      const res = await transitionSalesOrderStatus(
        order.id,
        targetStatus,
        cancellationReason || undefined
      );
      if (!res.success) {
        setErrorMessage(res.error || `Failed to transition order to ${targetStatus}`);
        return;
      }
      setConfirmCancel(false);
      setCancellationReason('');
      onOrderUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Transition failed');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete draft order ${order.order_number}?`)) return;
    setIsTransitioning(true);
    try {
      const res = await deleteSalesOrderSafely(order.id);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to delete order');
        return;
      }
      onOrderUpdated();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Deletion failed');
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-modal-title"
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
              <div className="flex items-center gap-2.5">
                <h2 id="order-detail-modal-title" className="text-base sm:text-lg font-bold text-zinc-100">
                  {order.order_number}
                </h2>
                <Badge variant={getStatusBadgeVariant(order.status)} size="sm">
                  {order.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Created on {formatDate(order.order_date || order.created_at)}
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold">Operation Notice</p>
                <p className="text-zinc-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Customer & Order Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Customer Information
              </span>
              <p className="font-bold text-zinc-200">{customer?.name || order.customer?.name || 'Direct Client'}</p>
              {customer?.company_name && (
                <p className="text-zinc-400">{customer.company_name}</p>
              )}
              {customer?.email && (
                <p className="text-zinc-400 font-mono text-[11px]">{customer.email}</p>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Fulfillment & Billing Details
              </span>
              <div className="flex justify-between text-zinc-400">
                <span>Order Status:</span>
                <span className="font-semibold text-zinc-200 capitalize">{order.status}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Payment State:</span>
                <span className="font-semibold text-zinc-200 capitalize">
                  {order.payment_status || 'Unpaid'}
                </span>
              </div>
              {order.invoice_id && (
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-400">Linked Invoice:</span>
                  <button
                    type="button"
                    onClick={() => onViewInvoice && onViewInvoice(order.invoice_id!)}
                    className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 underline cursor-pointer text-xs"
                  >
                    <span>View Commercial Invoice</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Itemized Products ({items.length})
            </h3>
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Item Name / Snapshot SKU</th>
                      <th className="py-2.5 px-3 text-center w-20">Quantity</th>
                      <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                      <th className="py-2.5 px-3 text-right w-24">Discount</th>
                      <th className="py-2.5 px-3 text-right w-28">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-zinc-500">
                          No line items found for this order.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-zinc-200">{item.product_name_snapshot}</p>
                            <p className="font-mono text-[11px] text-zinc-500">{item.sku_snapshot}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-zinc-300">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                            {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-100">
                            {formatCurrency(item.line_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="p-3.5 bg-zinc-950/90 border-t border-zinc-800/80 flex flex-col items-end space-y-1.5 text-xs">
                <div className="flex justify-between w-48 text-zinc-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-zinc-200">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between w-48 text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between w-48 text-zinc-400">
                    <span>Tax:</span>
                    <span className="font-mono text-zinc-200">{formatCurrency(order.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between w-48 pt-1.5 border-t border-zinc-800 text-sm font-bold text-zinc-100">
                  <span>Order Total:</span>
                  <span className="font-mono text-rose-400">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                Fulfillment Instructions / Notes
              </span>
              <p className="text-zinc-300">{order.notes}</p>
            </div>
          )}

          {/* Order Status Transition Controls */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Order Lifecycle & Actions
            </h4>

            {confirmCancel ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2.5 animate-in fade-in">
                <p className="text-xs font-semibold text-rose-300">
                  Are you sure you want to cancel this order?
                </p>
                <p className="text-[11px] text-zinc-400">
                  Cancelling an active order triggers compensating inventory restoration movements into the audit ledger so stock numbers remain physically accurate.
                </p>
                <input
                  type="text"
                  placeholder="Reason for cancellation (e.g. Customer requested refund)..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={isTransitioning}
                    onClick={() => handleStatusTransition('cancelled')}
                  >
                    Confirm Cancellation & Restore Stock
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                {order.status === 'draft' && (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isTransitioning}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleStatusTransition('confirmed')}
                  >
                    Confirm Order (Deduct Stock)
                  </Button>
                )}

                {order.status === 'confirmed' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={isTransitioning}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleStatusTransition('completed')}
                  >
                    Mark as Completed
                  </Button>
                )}

                {order.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw className="w-4 h-4 text-zinc-400" />}
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel Order
                  </Button>
                )}

                {(order.status === 'draft' || order.status === 'cancelled') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-400 border-zinc-800 hover:bg-rose-500/10"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDelete}
                  >
                    Delete Record
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400">
          <span>Cherryflow Commercial Ledger</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
