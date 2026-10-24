/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowUpDown, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Product, InventoryAdjustmentType } from '../../types/database';
import { performStockAdjustment } from '../../services/business/records';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjusted: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onAdjusted,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<InventoryAdjustmentType>('received');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setQuantityInput('');
    setReason('');
    setAdjustmentType('received');
    setErrorMessage(null);
  }, [product, isOpen]);

  if (!product) return null;

  const currentQty = Number(product.stock_quantity) || 0;
  const parsedQty = parseInt(quantityInput, 10) || 0;

  // Calculate delta based on adjustment type
  let quantityDelta = 0;
  if (adjustmentType === 'received') {
    quantityDelta = Math.abs(parsedQty);
  } else if (adjustmentType === 'damaged' || adjustmentType === 'reduction') {
    quantityDelta = -Math.abs(parsedQty);
  } else if (adjustmentType === 'correction') {
    // For correction, quantity can be positive or negative
    quantityDelta = parsedQty;
  }

  const projectedNewQty = currentQty + quantityDelta;
  const isNegativeStock = projectedNewQty < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (parsedQty === 0) {
      setErrorMessage('Please enter a non-zero quantity for the adjustment.');
      return;
    }

    if (isNegativeStock) {
      setErrorMessage(`Cannot adjust stock below zero. Maximum deduction available is ${currentQty} units.`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('An audit explanation/reason is required for every inventory adjustment.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await performStockAdjustment({
        productId: product.id,
        adjustmentType,
        quantityChange: quantityDelta,
        reason: reason.trim(),
        performedBy: 'Authorized Manager',
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to complete stock adjustment');
      }

      onAdjusted();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Adjustment"
      description="Update physical inventory on-hand balance with an immutable audit entry."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Product Summary Header */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Target Product</span>
            <p className="text-sm font-bold text-zinc-100">{product.name}</p>
            <p className="text-xs text-rose-400 font-mono mt-0.5">{product.sku}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Current Stock</span>
            <span className="text-xl font-mono font-bold text-zinc-100">{currentQty}</span>
            <span className="text-[11px] text-zinc-400 ml-1">{product.unit || 'units'}</span>
          </div>
        </div>

        {/* Adjustment Type Radio/Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300">Adjustment Type *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustmentType('received')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                adjustmentType === 'received'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stock Received</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">Supplier arrival or purchase inward (+)</p>
            </button>

            <button
              type="button"
              onClick={() => setAdjustmentType('reduction')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                adjustmentType === 'reduction'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                <span>Inventory Reduction</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">Manual write-down or outbound (-)</p>
            </button>

            <button
              type="button"
              onClick={() => setAdjustmentType('damaged')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                adjustmentType === 'damaged'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Damaged / Lost</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">Scrap, expired, or shrinkage (-)</p>
            </button>

            <button
              type="button"
              onClick={() => setAdjustmentType('correction')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                adjustmentType === 'correction'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Audit Correction</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">Physical cycle count delta (+/-)</p>
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <Input
          label={
            adjustmentType === 'correction'
              ? 'Quantity Delta (+ for increase, - for decrease) *'
              : 'Quantity to Adjust *'
          }
          type="number"
          step="1"
          placeholder={adjustmentType === 'received' ? 'e.g. 25' : 'e.g. 5'}
          value={quantityInput}
          onChange={(e) => setQuantityInput(e.target.value)}
          required
        />

        {/* Live Stock Level Projection Box */}
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between">
          <div className="text-zinc-400">
            <span>Previous: <strong>{currentQty}</strong></span>
            <span className="mx-2">➔</span>
            <span>
              Delta:{' '}
              <strong className={quantityDelta > 0 ? 'text-emerald-400' : quantityDelta < 0 ? 'text-rose-400' : ''}>
                {quantityDelta > 0 ? `+${quantityDelta}` : quantityDelta}
              </strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-zinc-500 text-[11px] block">New Stock Balance:</span>
            <span className={`font-mono font-bold text-sm ${isNegativeStock ? 'text-rose-500' : 'text-zinc-100'}`}>
              {projectedNewQty} {product.unit || 'units'}
            </span>
          </div>
        </div>

        {/* Reason field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300">Adjustment Reason / Reference *</label>
          <textarea
            rows={2}
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
            placeholder="e.g. Supplier PO-4482 received in main warehouse bin B-04"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={isNegativeStock}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
