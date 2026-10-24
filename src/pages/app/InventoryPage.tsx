/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Boxes, Plus, Search, AlertTriangle, ArrowUpDown, Database } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
  EmptyState,
  LoadingState,
  ErrorState,
  ViewStateMode,
} from '../../components/common/StateViewer';
import { CHERRYFLOW_SCHEMA_TABLES } from '../../services/supabase/schema';

import { Modal } from '../../components/common/Modal';

export const InventoryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewStateMode>('ready');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditSku, setAuditSku] = useState('');
  const [auditQty, setAuditQty] = useState('');
  const [auditReason, setAuditReason] = useState('cycle_count');

  const inventorySchema = CHERRYFLOW_SCHEMA_TABLES.find((t) => t.tableName === 'inventory_items');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-100">Inventory & Stock</h2>
            <Badge variant="cherry" size="sm">Stock Logistics</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time physical inventory monitoring, low-stock alerts, and warehouse allocations.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAuditModalOpen(true)}
          leftIcon={<ArrowUpDown className="w-4 h-4 text-rose-400" />}
        >
          Stock Audit Adjustment
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by SKU, bin location, or item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
          />
        </div>
        <select
          className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
          defaultValue="all"
        >
          <option value="all">All Stock Statuses</option>
          <option value="low">Low Stock Alerts</option>
          <option value="adequate">Normal Levels</option>
        </select>
      </div>

      {/* States */}
      {viewMode === 'empty' && (
        <EmptyState
          title="No inventory recorded"
          description="Warehouse has no recorded items on hand. Add catalog items or record initial stock to populate your warehouse ledger."
          icon={<Boxes className="w-6 h-6 text-zinc-400" />}
          actionLabel="Record Initial Stock"
          onAction={() => setViewMode('ready')}
        />
      )}

      {viewMode === 'loading' && (
        <LoadingState rows={5} label="Auditing warehouse stock levels from database..." />
      )}

      {viewMode === 'error' && (
        <ErrorState
          title="Inventory Ledger Synchronization Error"
          message="Could not resolve inventory record relation. Please verify your product catalog."
          onRetry={() => setViewMode('ready')}
          troubleshooting={[
            'Ensure products exist prior to creating inventory item records.',
            'Verify tenant organization authorization.',
          ]}
        />
      )}

      {viewMode === 'ready' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Inventory Balances</CardTitle>
                  <CardDescription>
                    Live warehouse stock tracking with minimum thresholds and reorder triggers
                  </CardDescription>
                </div>
                <Badge variant="outline" size="sm">
                  Active Warehouse
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product SKU</th>
                    <th className="px-4 py-3 font-medium">Item Description</th>
                    <th className="px-4 py-3 font-medium">On Hand</th>
                    <th className="px-4 py-3 font-medium">Reorder Point</th>
                    <th className="px-4 py-3 font-medium">Batch Target</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium text-right">Stock Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-400">
                  <tr className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3.5 text-rose-400 font-semibold">PRD-8820</td>
                    <td className="px-4 py-3.5 text-zinc-200 font-sans font-medium">High-Pressure Hydraulic Valve</td>
                    <td className="px-4 py-3.5 text-zinc-100 font-bold">142 units</td>
                    <td className="px-4 py-3.5">25 units</td>
                    <td className="px-4 py-3.5">100 units</td>
                    <td className="px-4 py-3.5 font-sans">Aisle 4, Bay B</td>
                    <td className="px-4 py-3.5 text-right font-sans">
                      <Badge variant="success" size="sm">Adequate</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3.5 text-rose-400 font-semibold">PRD-9102</td>
                    <td className="px-4 py-3.5 text-zinc-200 font-sans font-medium">Braided Stainless Hose (2m)</td>
                    <td className="px-4 py-3.5 text-amber-400 font-bold">8 pieces</td>
                    <td className="px-4 py-3.5">15 pieces</td>
                    <td className="px-4 py-3.5">50 pieces</td>
                    <td className="px-4 py-3.5 font-sans">Aisle 1, Shelf 3</td>
                    <td className="px-4 py-3.5 text-right font-sans">
                      <Badge variant="warning" size="sm">Low Stock</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Database Schema Blueprint Details */}
          {inventorySchema && (
            <Card className="border-zinc-800/80 bg-zinc-950/60">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-500" />
                  <CardTitle className="text-xs font-semibold">
                    PostgreSQL Table Specification ({inventorySchema.tableName})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {inventorySchema.columns.map((col) => (
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

      {/* Stock Audit Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Stock Level Audit Adjustment"
        description="Record physical warehouse stock verification or scrap reconciliation."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Product SKU or Barcode"
            placeholder="e.g. SKU-HW-101"
            value={auditSku}
            onChange={(e) => setAuditSku(e.target.value)}
            required
          />
          <Input
            label="Physical Count Verified"
            type="number"
            placeholder="Current count on shelf..."
            value={auditQty}
            onChange={(e) => setAuditQty(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Adjustment Reason</label>
            <select
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="cycle_count">Routine Cycle Count</option>
              <option value="damaged">Damaged / Written-Off</option>
              <option value="received">Inbound Shipment Discrepancy</option>
              <option value="customer_return">Customer Return</option>
            </select>
          </div>
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAuditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsAuditModalOpen(false);
                setAuditSku('');
                setAuditQty('');
              }}
            >
              Save Audit Entry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
