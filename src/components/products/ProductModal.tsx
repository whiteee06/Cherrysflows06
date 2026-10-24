/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Package, Hash, Tag, DollarSign, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Product, ProductStatus } from '../../types/database';
import {
  ProductFormValues,
  ProductValidationErrors,
  validateProductForm,
} from '../../utils/product';
import { insertRecord, updateRecord } from '../../services/business/records';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  existingProducts: Product[];
  onSaved: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  existingProducts,
  onSaved,
}) => {
  const isEditing = Boolean(productToEdit);

  const [values, setValues] = useState<ProductFormValues>({
    name: '',
    sku: '',
    description: '',
    category: '',
    sellingPrice: '',
    costPrice: '',
    stockQuantity: '0',
    lowStockThreshold: '10',
    unit: 'unit',
    status: 'active',
  });

  const [errors, setErrors] = useState<ProductValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setValues({
        name: productToEdit.name || '',
        sku: productToEdit.sku || '',
        description: productToEdit.description || '',
        category: productToEdit.category || '',
        sellingPrice: String(productToEdit.selling_price ?? productToEdit.unit_price ?? ''),
        costPrice: String(productToEdit.cost_price ?? ''),
        stockQuantity: String(productToEdit.stock_quantity ?? '0'),
        lowStockThreshold: String(productToEdit.low_stock_threshold ?? '10'),
        unit: productToEdit.unit || productToEdit.unit_of_measure || 'unit',
        status: productToEdit.status || (productToEdit.is_active ? 'active' : 'inactive'),
      });
    } else {
      setValues({
        name: '',
        sku: '',
        description: '',
        category: '',
        sellingPrice: '',
        costPrice: '',
        stockQuantity: '0',
        lowStockThreshold: '10',
        unit: 'unit',
        status: 'active',
      });
    }
    setErrors({});
    setServerError(null);
  }, [productToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateProductForm(values, existingProducts, productToEdit?.id);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const sellingNum = parseFloat(values.sellingPrice);
      const costNum = parseFloat(values.costPrice);
      const stockNum = parseInt(values.stockQuantity, 10);
      const thresholdNum = parseInt(values.lowStockThreshold, 10);

      const payload = {
        name: values.name.trim(),
        sku: values.sku.trim().toUpperCase(),
        description: values.description.trim() || undefined,
        category: values.category.trim() || undefined,
        selling_price: sellingNum,
        unit_price: sellingNum,
        cost_price: costNum,
        // When editing, preserve existing stock; stock adjustments handle on-hand updates
        stock_quantity: isEditing ? (productToEdit?.stock_quantity ?? stockNum) : stockNum,
        low_stock_threshold: thresholdNum,
        unit: values.unit.trim() || 'unit',
        unit_of_measure: values.unit.trim() || 'unit',
        status: values.status,
        is_active: values.status === 'active',
        track_inventory: true,
      };

      if (isEditing && productToEdit) {
        const res = await updateRecord<Product>('products', productToEdit.id, payload);
        if (!res.success) {
          throw new Error(res.error || 'Failed to update product');
        }
      } else {
        const res = await insertRecord('products', {
          ...payload,
          organization_id: 'org_cherryflow_demo',
        });
        if (!res.success) {
          throw new Error(res.error || 'Failed to create product');
        }
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Product Item' : 'Add New Product'}
      description={
        isEditing
          ? 'Update product catalog parameters, pricing, and thresholds.'
          : 'Register a new SKU into your commercial catalog with inventory tracking.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Product Name *"
            placeholder="e.g. Wireless Barcode Scanner"
            value={values.name}
            onChange={(e) => {
              setValues({ ...values, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            error={errors.name}
            leftIcon={<Package className="w-4 h-4 text-zinc-500" />}
            required
          />

          <Input
            label="Stock Keeping Unit (SKU) *"
            placeholder="e.g. SKU-HW-102"
            value={values.sku}
            onChange={(e) => {
              setValues({ ...values, sku: e.target.value });
              if (errors.sku) setErrors({ ...errors, sku: undefined });
            }}
            error={errors.sku}
            leftIcon={<Hash className="w-4 h-4 text-zinc-500" />}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Category"
            placeholder="e.g. Hardware, Supplies, Services"
            value={values.category}
            onChange={(e) => setValues({ ...values, category: e.target.value })}
            leftIcon={<Tag className="w-4 h-4 text-zinc-500" />}
          />

          <Input
            label="Unit of Measure"
            placeholder="e.g. unit, box, kg, pack"
            value={values.unit}
            onChange={(e) => setValues({ ...values, unit: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Selling Price ($) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={values.sellingPrice}
            onChange={(e) => {
              setValues({ ...values, sellingPrice: e.target.value });
              if (errors.sellingPrice) setErrors({ ...errors, sellingPrice: undefined });
            }}
            error={errors.sellingPrice}
            leftIcon={<DollarSign className="w-4 h-4 text-zinc-500" />}
            required
          />

          <Input
            label="Cost Price ($) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={values.costPrice}
            onChange={(e) => {
              setValues({ ...values, costPrice: e.target.value });
              if (errors.costPrice) setErrors({ ...errors, costPrice: undefined });
            }}
            error={errors.costPrice}
            leftIcon={<DollarSign className="w-4 h-4 text-zinc-500" />}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              label={isEditing ? 'Stock Quantity (Read-only)' : 'Initial Stock Quantity *'}
              type="number"
              min="0"
              placeholder="0"
              value={values.stockQuantity}
              disabled={isEditing}
              onChange={(e) => {
                setValues({ ...values, stockQuantity: e.target.value });
                if (errors.stockQuantity) setErrors({ ...errors, stockQuantity: undefined });
              }}
              error={errors.stockQuantity}
              leftIcon={<Layers className="w-4 h-4 text-zinc-500" />}
              required
            />
            {isEditing && (
              <p className="text-[11px] text-zinc-500 mt-1">
                Use the <strong>Adjust Stock</strong> action to audit or change on-hand inventory.
              </p>
            )}
          </div>

          <Input
            label="Low-Stock Alert Threshold *"
            type="number"
            min="0"
            placeholder="10"
            value={values.lowStockThreshold}
            onChange={(e) => {
              setValues({ ...values, lowStockThreshold: e.target.value });
              if (errors.lowStockThreshold) setErrors({ ...errors, lowStockThreshold: undefined });
            }}
            error={errors.lowStockThreshold}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Description</label>
            <textarea
              rows={2}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
              placeholder="Technical specifications, warranty details, or supplier notes..."
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Status</label>
            <select
              value={values.status}
              onChange={(e) => setValues({ ...values, status: e.target.value as ProductStatus })}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
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
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
