/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, StockStatus, ProductStatus } from '../types/database';

export type ProductSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'stock_asc'
  | 'stock_desc'
  | 'newest'
  | 'oldest';

export type StockFilterOption = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type StatusFilterOption = 'all' | 'active' | 'inactive';

export interface ProductFormValues {
  name: string;
  sku: string;
  description: string;
  category: string;
  sellingPrice: string;
  costPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
  unit: string;
  status: ProductStatus;
}

export interface ProductValidationErrors {
  name?: string;
  sku?: string;
  sellingPrice?: string;
  costPrice?: string;
  stockQuantity?: string;
  lowStockThreshold?: string;
}

/**
 * Determines stock level status according to strict rules:
 * - Out of Stock: quantity === 0
 * - Low Stock: quantity > 0 && quantity <= threshold
 * - In Stock: quantity > threshold
 */
export function getStockStatus(product: {
  stock_quantity: number;
  low_stock_threshold: number;
}): StockStatus {
  const qty = Number(product.stock_quantity) || 0;
  const threshold = Number(product.low_stock_threshold) || 0;

  if (qty <= 0) {
    return 'out_of_stock';
  }
  if (qty <= threshold) {
    return 'low_stock';
  }
  return 'in_stock';
}

/**
 * Validates product form inputs and checks for SKU uniqueness
 */
export function validateProductForm(
  values: ProductFormValues,
  existingProducts: Product[] = [],
  editingProductId?: string
): {
  isValid: boolean;
  errors: ProductValidationErrors;
} {
  const errors: ProductValidationErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = 'Product name is required';
  } else if (trimmedName.length < 2) {
    errors.name = 'Product name must be at least 2 characters';
  }

  const trimmedSku = values.sku.trim();
  if (!trimmedSku) {
    errors.sku = 'SKU is required';
  } else {
    // Check SKU uniqueness within the organization
    const duplicate = existingProducts.find(
      (p) =>
        p.sku.toLowerCase() === trimmedSku.toLowerCase() &&
        p.id !== editingProductId
    );
    if (duplicate) {
      errors.sku = `SKU "${trimmedSku}" is already in use by "${duplicate.name}"`;
    }
  }

  // Validate Selling Price
  const sellingNum = parseFloat(values.sellingPrice);
  if (isNaN(sellingNum)) {
    errors.sellingPrice = 'Valid selling price is required';
  } else if (sellingNum < 0) {
    errors.sellingPrice = 'Selling price cannot be negative';
  }

  // Validate Cost Price
  const costNum = parseFloat(values.costPrice);
  if (isNaN(costNum)) {
    errors.costPrice = 'Valid cost price is required';
  } else if (costNum < 0) {
    errors.costPrice = 'Cost price cannot be negative';
  }

  // Validate Stock Quantity
  const stockNum = parseInt(values.stockQuantity, 10);
  if (isNaN(stockNum)) {
    errors.stockQuantity = 'Stock quantity is required';
  } else if (stockNum < 0) {
    errors.stockQuantity = 'Stock quantity cannot be negative';
  }

  // Validate Low-Stock Threshold
  const thresholdNum = parseInt(values.lowStockThreshold, 10);
  if (isNaN(thresholdNum)) {
    errors.lowStockThreshold = 'Low-stock threshold is required';
  } else if (thresholdNum < 0) {
    errors.lowStockThreshold = 'Threshold cannot be negative';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Filters and sorts product records across all dimensions
 */
export function filterAndSortProducts(
  products: Product[],
  searchQuery: string,
  categoryFilter: string,
  stockFilter: StockFilterOption,
  statusFilter: StatusFilterOption,
  sortOption: ProductSortOption
): Product[] {
  const query = searchQuery.trim().toLowerCase();

  // 1. Filtering
  const filtered = products.filter((p) => {
    // Status filter
    if (statusFilter !== 'all' && p.status !== statusFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && p.category !== categoryFilter) {
      return false;
    }

    // Stock Status filter
    if (stockFilter !== 'all') {
      const status = getStockStatus(p);
      if (status !== stockFilter) {
        return false;
      }
    }

    // Search query across name, sku, description, category
    if (query) {
      const matchName = p.name.toLowerCase().includes(query);
      const matchSku = p.sku.toLowerCase().includes(query);
      const matchCategory = (p.category || '').toLowerCase().includes(query);
      const matchDesc = (p.description || '').toLowerCase().includes(query);

      return matchName || matchSku || matchCategory || matchDesc;
    }

    return true;
  });

  // 2. Sorting
  return filtered.sort((a, b) => {
    switch (sortOption) {
      case 'name_asc':
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      case 'name_desc':
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      case 'price_asc':
        return (a.selling_price || a.unit_price || 0) - (b.selling_price || b.unit_price || 0);
      case 'price_desc':
        return (b.selling_price || b.unit_price || 0) - (a.selling_price || a.unit_price || 0);
      case 'stock_asc':
        return a.stock_quantity - b.stock_quantity;
      case 'stock_desc':
        return b.stock_quantity - a.stock_quantity;
      case 'newest': {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return timeB - timeA;
      }
      case 'oldest': {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return timeA - timeB;
      }
      default:
        return 0;
    }
  });
}

/**
 * Calculates live product & inventory metrics
 */
export function calculateProductStats(products: Product[]): {
  total: number;
  active: number;
  inactive: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValuation: number;
  lowStockProducts: Product[];
} {
  let active = 0;
  let inactive = 0;
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalValuation = 0;
  const lowStockProducts: Product[] = [];

  for (const p of products) {
    if (p.status === 'active') {
      active++;
    } else {
      inactive++;
    }

    const status = getStockStatus(p);
    if (status === 'out_of_stock') {
      outOfStock++;
    } else if (status === 'low_stock') {
      lowStock++;
      lowStockProducts.push(p);
    } else {
      inStock++;
    }

    const qty = Number(p.stock_quantity) || 0;
    const cost = Number(p.cost_price) || 0;
    totalValuation += qty * cost;
  }

  return {
    total: products.length,
    active,
    inactive,
    inStock,
    lowStock,
    outOfStock,
    totalValuation: Math.round(totalValuation * 100) / 100,
    lowStockProducts,
  };
}
