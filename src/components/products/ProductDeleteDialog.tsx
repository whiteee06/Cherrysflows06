/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Archive, Trash2, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Product } from '../../types/database';
import {
  checkProductDependencies,
  deleteRecord,
  updateRecord,
} from '../../services/business/records';

interface ProductDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onDeleted: () => void;
}

export const ProductDeleteDialog: React.FC<ProductDeleteDialogProps> = ({
  isOpen,
  onClose,
  product,
  onDeleted,
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dependencyInfo, setDependencyInfo] = useState<{
    hasDependencies: boolean;
    orderCount: number;
    adjustmentCount: number;
  }>({
    hasDependencies: false,
    orderCount: 0,
    adjustmentCount: 0,
  });

  useEffect(() => {
    let active = true;
    if (product && isOpen) {
      setIsChecking(true);
      setErrorMessage(null);
      checkProductDependencies(product.id)
        .then((info) => {
          if (active) {
            setDependencyInfo({
              hasDependencies: info.hasDependencies,
              orderCount: info.orderCount,
              adjustmentCount: info.adjustmentCount,
            });
            setIsChecking(false);
          }
        })
        .catch((err) => {
          if (active) {
            setIsChecking(false);
            console.error('Failed to verify product dependencies:', err);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [product, isOpen]);

  if (!product) return null;

  const handleArchive = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await updateRecord<Product>('products', product.id, {
        status: 'inactive',
        is_active: false,
      });
      if (!res.success) {
        throw new Error(res.error || 'Failed to archive product item');
      }
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await deleteRecord('products', product.id);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete product from database');
      }
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Product Item"
      description="Preserve relational integrity across sales orders and inventory adjustments."
      size="md"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">Target SKU</span>
          <p className="text-sm font-bold text-zinc-100">{product.name}</p>
          <p className="text-xs text-rose-400 font-mono font-semibold">{product.sku}</p>
        </div>

        {isChecking ? (
          <div className="py-6 text-center text-xs text-zinc-400">
            Checking relational references across sales orders and inventory ledgers...
          </div>
        ) : dependencyInfo.hasDependencies ? (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/80 text-amber-200 text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">Historical Dependencies Detected</p>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  This product is referenced by{' '}
                  <strong>{dependencyInfo.orderCount} sales order{dependencyInfo.orderCount === 1 ? '' : 's'}</strong>{' '}
                  and{' '}
                  <strong>{dependencyInfo.adjustmentCount} stock adjustment{dependencyInfo.adjustmentCount === 1 ? '' : 's'}</strong>.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Permanently deleting this SKU would break historical invoices and inventory audits. We recommend archiving this product as <strong>Inactive</strong> instead so it cannot be selected for new orders.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Are you sure you want to permanently delete this product?</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              No sales orders or inventory adjustments reference this SKU. This record will be permanently deleted from the database.
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>

          {dependencyInfo.hasDependencies ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleArchive}
              isLoading={isProcessing}
              leftIcon={<Archive className="w-4 h-4 text-amber-400" />}
            >
              Archive as Inactive
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={handlePermanentDelete}
              isLoading={isProcessing}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Delete
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
