/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Tag,
  TrendingDown,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/StateViewer';
import { Product, InventoryAdjustment } from '../../types/database';
import { fetchBusinessRecords } from '../../services/business/records';
import { CHERRYFLOW_SCHEMA_TABLES } from '../../services/supabase/schema';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ProductSortOption,
  StockFilterOption,
  StatusFilterOption,
  filterAndSortProducts,
  calculateProductStats,
  getStockStatus,
} from '../../utils/product';
import { ProductModal } from '../../components/products/ProductModal';
import { ProductDetailModal } from '../../components/products/ProductDetailModal';
import { StockAdjustmentModal } from '../../components/products/StockAdjustmentModal';
import { ProductDeleteDialog } from '../../components/products/ProductDeleteDialog';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilterOption>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [sortOption, setSortOption] = useState<ProductSortOption>('name_asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const productTableSchema = CHERRYFLOW_SCHEMA_TABLES.find((t) => t.tableName === 'products');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const bundle = await fetchBusinessRecords();
      setProducts(bundle.products);
      setAdjustments(bundle.adjustments || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve products from database';
      setErrorMessage(msg);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique categories list for dropdown filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Derived real product and stock statistics
  const stats = useMemo(() => {
    return calculateProductStats(products);
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return filterAndSortProducts(
      products,
      searchQuery,
      categoryFilter,
      stockFilter,
      statusFilter,
      sortOption
    );
  }, [products, searchQuery, categoryFilter, stockFilter, statusFilter, sortOption]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, stockFilter, statusFilter, sortOption]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/50 text-emerald-300 text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 tracking-tight">
              Products & Inventory
            </h2>
            <Badge variant="cherry" size="sm">
              Catalog Core
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Product catalog, physical inventory tracking, SKU parameters, and stock adjustment ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Refresh product catalog"
            title="Refresh database records"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setProductToEdit(null);
              setIsAddEditModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Products</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-zinc-100 mt-2">{stats.total}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{stats.active} active in catalog</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">In Stock SKUs</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2">{stats.inStock}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Sufficient inventory levels</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Low Stock Alerts</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-amber-400 mt-2">{stats.lowStock}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">At or below alert threshold</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Out of Stock</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <p className={`text-2xl font-extrabold mt-2 ${stats.outOfStock > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
            {stats.outOfStock}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Inventory at zero units</p>
        </div>
      </div>

      {/* Low-Stock Alert Notification Banner (Requirement 7) */}
      {stats.lowStockProducts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/70 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">
                Low Stock Warning: {stats.lowStockProducts.length} product{stats.lowStockProducts.length === 1 ? '' : 's'} require replenishment
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {stats.lowStockProducts.map((p) => `${p.name} (${p.stock_quantity} left, threshold: ${p.low_stock_threshold})`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStockFilter('low_stock')}
            className="px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 border border-amber-700/80 text-amber-100 text-xs font-semibold whitespace-nowrap self-start sm:self-center cursor-pointer transition-colors"
          >
            View Low Stock
          </button>
        </div>
      )}

      {/* Search, Filter & Sort Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Search by product name, SKU, category, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilterOption)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (Alert)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterOption)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="all">Active & Inactive</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as ProductSortOption)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="stock_asc">Stock (Low to High)</option>
              <option value="stock_desc">Stock (High to Low)</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorState
          title="Failed to Load Products"
          message={errorMessage}
          onRetry={() => loadData()}
        />
      )}

      {/* Loading state skeleton */}
      {isLoading ? (
        <LoadingState message="Retrieving authorized product catalog and inventory balances..." />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title={searchQuery || stockFilter !== 'all' || categoryFilter !== 'all' ? 'No matching products found' : 'No products in catalog yet'}
          description={
            searchQuery || stockFilter !== 'all'
              ? 'Try adjusting your search criteria or resetting the filters.'
              : 'Add your first commercial product or SKU to begin tracking inventory and booking sales orders.'
          }
          icon={<Package className="w-8 h-8 text-zinc-500" />}
          actionLabel="Add Product"
          onAction={() => {
            setProductToEdit(null);
            setIsAddEditModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Responsive Products Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-semibold tracking-wider uppercase text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Product / SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-right hidden sm:table-cell">Cost Price</th>
                    <th className="py-3.5 px-4 text-right">Stock Level</th>
                    <th className="py-3.5 px-4 text-center">Stock Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/20">
                  {paginatedProducts.map((p) => {
                    const status = getStockStatus(p);
                    const selling = Number(p.selling_price ?? p.unit_price) || 0;
                    const cost = Number(p.cost_price) || 0;

                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/50 transition-colors group">
                        {/* Product / SKU */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-rose-400 font-bold text-xs shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setDetailProduct(p)}
                                className="font-bold text-zinc-100 hover:text-rose-400 truncate text-left block cursor-pointer transition-colors"
                              >
                                {p.name}
                              </button>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-rose-400 text-[11px] font-semibold">{p.sku}</span>
                                {p.status === 'inactive' && (
                                  <Badge variant="muted" size="sm" className="text-[10px] py-0 px-1">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-zinc-300">
                          {p.category ? (
                            <Badge variant="outline" size="sm" className="border-zinc-800 text-zinc-300">
                              {p.category}
                            </Badge>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-4 text-right font-bold text-zinc-100 font-mono">
                          {formatCurrency(selling)}
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 px-4 text-right font-mono text-zinc-400 hidden sm:table-cell">
                          {formatCurrency(cost)}
                        </td>

                        {/* Stock Level */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono font-bold ${
                              status === 'in_stock'
                                ? 'text-zinc-100'
                                : status === 'low_stock'
                                ? 'text-amber-400'
                                : 'text-rose-500'
                            }`}
                          >
                            {p.stock_quantity}
                          </span>
                          <span className="text-zinc-500 text-[11px] ml-1">{p.unit || 'units'}</span>
                        </td>

                        {/* Stock Status Badge */}
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              status === 'in_stock'
                                ? 'success'
                                : status === 'low_stock'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {status === 'in_stock'
                              ? 'In Stock'
                              : status === 'low_stock'
                              ? 'Low Stock'
                              : 'Out of Stock'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAdjustProduct(p)}
                              title="Adjust Stock"
                              aria-label={`Adjust stock for ${p.name}`}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDetailProduct(p)}
                              title="View Details"
                              aria-label={`View details for ${p.name}`}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setProductToEdit(p);
                                setIsAddEditModalOpen(true);
                              }}
                              title="Edit Product"
                              aria-label={`Edit ${p.name}`}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteProduct(p)}
                              title="Delete or Archive Product"
                              aria-label={`Delete ${p.name}`}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-500 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="py-3 px-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
              <div>
                Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> of{' '}
                <strong>{filteredProducts.length}</strong> product{filteredProducts.length === 1 ? '' : 's'}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>

                <span className="px-2 font-mono text-[11px] text-zinc-300">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Database Schema Reference Accordion */}
          {productTableSchema && (
            <Card className="border-zinc-800/80 bg-zinc-950/60 mt-6">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-rose-500" />
                    <CardTitle className="text-xs font-semibold">
                      PostgreSQL Table Specification ({productTableSchema.tableName})
                    </CardTitle>
                  </div>
                  <Badge variant="outline" size="sm" className="border-zinc-800 text-zinc-400">
                    Row Level Security Active
                  </Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Configured with tenant isolation, unique SKU constraints per organization, and atomic audit triggers.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {productTableSchema.columns.map((col) => (
                    <div key={col.name} className="p-2 rounded bg-zinc-900 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-zinc-200 font-semibold">{col.name}</span>
                        <span className="font-mono text-[10px] text-rose-400">{col.type}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">{col.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <ProductModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        productToEdit={productToEdit}
        existingProducts={products}
        onSaved={() => {
          loadData(true);
          showToast(
            productToEdit
              ? `Product "${productToEdit.name}" updated successfully.`
              : 'New product added to catalog successfully.'
          );
        }}
      />

      <ProductDetailModal
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        product={detailProduct}
        adjustments={adjustments}
        onOpenEdit={(p) => {
          setProductToEdit(p);
          setIsAddEditModalOpen(true);
        }}
        onOpenAdjust={(p) => {
          setAdjustProduct(p);
        }}
        onOpenDelete={(p) => {
          setDeleteProduct(p);
        }}
      />

      <StockAdjustmentModal
        isOpen={Boolean(adjustProduct)}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
        onAdjusted={() => {
          loadData(true);
          showToast('Stock adjustment successfully logged into inventory ledger.');
        }}
      />

      <ProductDeleteDialog
        isOpen={Boolean(deleteProduct)}
        onClose={() => setDeleteProduct(null)}
        product={deleteProduct}
        onDeleted={() => {
          loadData(true);
          showToast('Product record updated/removed successfully.');
        }}
      />
    </div>
  );
};
