/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStockStatus,
  validateProductForm,
  filterAndSortProducts,
  calculateProductStats,
  ProductFormValues,
} from './product';
import { Product } from '../types/database';

test('getStockStatus classifies out_of_stock, low_stock, and in_stock accurately', () => {
  // Out of stock (0 units)
  assert.equal(getStockStatus({ stock_quantity: 0, low_stock_threshold: 5 }), 'out_of_stock');
  assert.equal(getStockStatus({ stock_quantity: -1, low_stock_threshold: 5 }), 'out_of_stock');

  // Low stock (between 1 and threshold inclusive)
  assert.equal(getStockStatus({ stock_quantity: 1, low_stock_threshold: 5 }), 'low_stock');
  assert.equal(getStockStatus({ stock_quantity: 5, low_stock_threshold: 5 }), 'low_stock');

  // In stock (strictly above threshold)
  assert.equal(getStockStatus({ stock_quantity: 6, low_stock_threshold: 5 }), 'in_stock');
  assert.equal(getStockStatus({ stock_quantity: 100, low_stock_threshold: 10 }), 'in_stock');
});

test('validateProductForm enforces required fields, positive numbers, and SKU uniqueness', () => {
  const existing: Product[] = [
    {
      id: 'p1',
      organization_id: 'org1',
      sku: 'SKU-001',
      name: 'Existing Scanner',
      selling_price: 100,
      unit_price: 100,
      cost_price: 50,
      stock_quantity: 10,
      low_stock_threshold: 2,
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'active',
      is_active: true,
      track_inventory: true,
      created_at: '',
      updated_at: '',
    },
  ];

  const duplicateSkuForm: ProductFormValues = {
    name: 'New Scanner',
    sku: 'SKU-001',
    description: '',
    category: 'Hardware',
    sellingPrice: '120',
    costPrice: '60',
    stockQuantity: '5',
    lowStockThreshold: '2',
    unit: 'unit',
    status: 'active',
  };

  const res = validateProductForm(duplicateSkuForm, existing);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.sku);

  // Negative prices or negative stock should fail
  const negativePriceForm: ProductFormValues = {
    ...duplicateSkuForm,
    sku: 'SKU-NEW-01',
    sellingPrice: '-10',
    stockQuantity: '-5',
  };
  const resNegative = validateProductForm(negativePriceForm, existing);
  assert.equal(resNegative.isValid, false);
  assert.ok(resNegative.errors.sellingPrice);
  assert.ok(resNegative.errors.stockQuantity);

  // Valid form
  const validForm: ProductFormValues = {
    ...duplicateSkuForm,
    sku: 'SKU-NEW-01',
    sellingPrice: '150.00',
    costPrice: '75.00',
    stockQuantity: '20',
    lowStockThreshold: '5',
  };
  const resValid = validateProductForm(validForm, existing);
  assert.equal(resValid.isValid, true);
  assert.equal(resValid.errors.name, undefined);
  assert.equal(resValid.errors.sku, undefined);
});

test('filterAndSortProducts filters by stock status, category, and search query', () => {
  const sample: Product[] = [
    {
      id: 'p1',
      organization_id: 'org1',
      sku: 'SKU-POS',
      name: 'POS Terminal',
      category: 'Hardware',
      selling_price: 500,
      unit_price: 500,
      cost_price: 250,
      stock_quantity: 3,
      low_stock_threshold: 10, // low_stock
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'active',
      is_active: true,
      track_inventory: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'p2',
      organization_id: 'org1',
      sku: 'SKU-PAPER',
      name: 'Receipt Paper',
      category: 'Supplies',
      selling_price: 20,
      unit_price: 20,
      cost_price: 10,
      stock_quantity: 100,
      low_stock_threshold: 15, // in_stock
      unit: 'box',
      unit_of_measure: 'box',
      status: 'active',
      is_active: true,
      track_inventory: true,
      created_at: '2026-02-01',
      updated_at: '2026-02-01',
    },
    {
      id: 'p3',
      organization_id: 'org1',
      sku: 'SKU-SCAN',
      name: 'USB Scanner',
      category: 'Hardware',
      selling_price: 80,
      unit_price: 80,
      cost_price: 40,
      stock_quantity: 0,
      low_stock_threshold: 5, // out_of_stock
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'inactive',
      is_active: false,
      track_inventory: true,
      created_at: '2026-03-01',
      updated_at: '2026-03-01',
    },
  ];

  // Filter low stock
  const lowStock = filterAndSortProducts(sample, '', 'all', 'low_stock', 'all', 'name_asc');
  assert.equal(lowStock.length, 1);
  assert.equal(lowStock[0].id, 'p1');

  // Filter category
  const supplies = filterAndSortProducts(sample, '', 'Supplies', 'all', 'all', 'name_asc');
  assert.equal(supplies.length, 1);
  assert.equal(supplies[0].id, 'p2');

  // Search SKU
  const scanMatch = filterAndSortProducts(sample, 'SKU-SCAN', 'all', 'all', 'all', 'name_asc');
  assert.equal(scanMatch.length, 1);
  assert.equal(scanMatch[0].id, 'p3');

  // Sort by price descending
  const priceDesc = filterAndSortProducts(sample, '', 'all', 'all', 'all', 'price_desc');
  assert.equal(priceDesc[0].id, 'p1'); // 500
  assert.equal(priceDesc[1].id, 'p3'); // 80
  assert.equal(priceDesc[2].id, 'p2'); // 20
});

test('calculateProductStats calculates correct tallies and inventory valuation', () => {
  const sample: Product[] = [
    {
      id: 'p1',
      organization_id: 'org1',
      sku: 'A',
      name: 'Item 1',
      selling_price: 100,
      unit_price: 100,
      cost_price: 40,
      stock_quantity: 5,
      low_stock_threshold: 10, // low
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'active',
      is_active: true,
      track_inventory: true,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'p2',
      organization_id: 'org1',
      sku: 'B',
      name: 'Item 2',
      selling_price: 200,
      unit_price: 200,
      cost_price: 100,
      stock_quantity: 0,
      low_stock_threshold: 5, // out
      unit: 'unit',
      unit_of_measure: 'unit',
      status: 'inactive',
      is_active: false,
      track_inventory: true,
      created_at: '',
      updated_at: '',
    },
  ];

  const stats = calculateProductStats(sample);
  assert.equal(stats.total, 2);
  assert.equal(stats.active, 1);
  assert.equal(stats.inactive, 1);
  assert.equal(stats.lowStock, 1);
  assert.equal(stats.outOfStock, 1);
  assert.equal(stats.inStock, 0);
  // Valuation = (40 * 5) + (100 * 0) = 200
  assert.equal(stats.totalValuation, 200);
});
