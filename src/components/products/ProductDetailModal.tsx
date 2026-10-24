/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  Package,
  Hash,
  Tag,
  DollarSign,
  Layers,
  ArrowUpDown,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Product, InventoryAdjustment } from '../../types/database';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getStockStatus } from '../../utils/product';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  adjustments: InventoryAdjustment[];
  onOpenEdit: (product: Product) => void;
  onOpenAdjust: (product: Product) => void;
  onOpenDelete: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  adjustments,
  onOpenEdit,
  onOpenAdjust,
  onOpenDelete,
}) => {
  if (!product) return null;

  const stockStatus = getStockStatus(product);
  const selling = Number(product.selling_price ?? product.unit_price) || 0;
  const cost = Number(product.cost_price) || 0;
  const marginPct = selling > 0 ? Math.round(((selling - cost) / selling) * 1000) / 10 : 0;
  const totalStockValuation = (Number(product.stock_quantity) || 0) * cost;

  // Product-specific inventory history sorted descending
  const productAdjustments = useMemo(() => {
    return adjustments
      .filter((a) => a.product_id === product.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [adjustments, product.id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      description={`SKU: ${product.sku} • Category: ${product.category || 'General'}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-rose-400 font-bold text-lg shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">{product.name}</h3>
                <Badge
                  variant={
                    stockStatus === 'in_stock'
                      ? 'success'
                      : stockStatus === 'low_stock'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                >
                  {stockStatus === 'in_stock'
                    ? 'In Stock'
                    : stockStatus === 'low_stock'
                    ? 'Low Stock Alert'
                    : 'Out of Stock'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {product.description || 'No detailed specifications recorded.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenAdjust(product);
              }}
              leftIcon={<ArrowUpDown className="w-3.5 h-3.5 text-rose-400" />}
            >
              Adjust Stock
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenEdit(product);
              }}
              leftIcon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClose();
                onOpenDelete(product);
              }}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Pricing & Stock Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Selling Price</span>
            <span className="text-lg font-bold text-zinc-100 mt-1 block">{formatCurrency(selling)}</span>
            <span className="text-[11px] text-zinc-500">Per {product.unit || 'unit'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Cost Price</span>
            <span className="text-lg font-bold text-zinc-100 mt-1 block">{formatCurrency(cost)}</span>
            <span className="text-[11px] text-zinc-500">Gross Margin: {marginPct}%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">On-Hand Stock</span>
            <span
              className={`text-lg font-bold mt-1 block ${
                stockStatus === 'in_stock'
                  ? 'text-zinc-100'
                  : stockStatus === 'low_stock'
                  ? 'text-amber-400'
                  : 'text-rose-500'
              }`}
            >
              {product.stock_quantity} {product.unit || 'units'}
            </span>
            <span className="text-[11px] text-zinc-500">Threshold: {product.low_stock_threshold}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Inventory Valuation</span>
            <span className="text-lg font-bold text-zinc-100 mt-1 block">{formatCurrency(totalStockValuation)}</span>
            <span className="text-[11px] text-zinc-500">At current cost price</span>
          </div>
        </div>

        {/* Technical Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <h4 className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-rose-500" />
              Catalog Identifiers
            </h4>
            <div className="space-y-1.5 text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">SKU Code:</span>
                <span className="font-mono text-rose-400 font-semibold">{product.sku}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Category:</span>
                <span>{product.category || 'General'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Unit of Measure:</span>
                <span>{product.unit || 'unit'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Catalog Status:</span>
                <span>{product.status === 'active' ? 'Active in Catalog' : 'Inactive / Archived'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <h4 className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              Audit Timestamps
            </h4>
            <div className="space-y-1.5 text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Product UUID:</span>
                <span className="font-mono text-[10px] text-zinc-400">{product.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Created:</span>
                <span>{product.created_at ? formatDate(product.created_at) : '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Last Modified:</span>
                <span>{product.updated_at ? formatDate(product.updated_at) : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Movement / Audit History */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-rose-500" />
            Stock Adjustment History ({productAdjustments.length} logged events)
          </h4>

          {productAdjustments.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center text-xs text-zinc-400">
              No manual stock adjustments logged yet for this item.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Quantity Delta</th>
                    <th className="py-2.5 px-3">Resulting Stock</th>
                    <th className="py-2.5 px-3">Reason / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                  {productAdjustments.map((adj) => {
                    return (
                      <tr key={adj.id} className="hover:bg-zinc-800/40">
                        <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                          {formatDate(adj.created_at)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                              adj.adjustment_type === 'received'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                : adj.adjustment_type === 'correction'
                                ? 'bg-blue-950/60 text-blue-400 border border-blue-800'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {adj.adjustment_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span
                            className={
                              adj.quantity_change > 0
                                ? 'text-emerald-400'
                                : adj.quantity_change < 0
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                            }
                          >
                            {adj.quantity_change > 0 ? `+${adj.quantity_change}` : adj.quantity_change}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-200">
                          {adj.new_quantity} {product.unit || 'units'}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">
                          {adj.reason}
                        </td>
                      </tr>
                    );
                  })}
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
