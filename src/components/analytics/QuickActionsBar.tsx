/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ShoppingBag, Package, Receipt, CreditCard, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

interface QuickActionsBarProps {
  onSeedDemoDataset?: () => void;
  onRefreshData?: () => void;
  isSeeding?: boolean;
  isRefreshing?: boolean;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onSeedDemoDataset,
  onRefreshData,
  isSeeding = false,
  isRefreshing = false,
}) => {
  const actions = [
    {
      label: 'New Sale',
      path: '/app/sales',
      icon: ShoppingBag,
      description: 'Record an order',
      color: 'hover:border-rose-700/60 hover:bg-rose-950/20',
    },
    {
      label: 'Add Product',
      path: '/app/products',
      icon: Package,
      description: 'Catalog new SKU',
      color: 'hover:border-blue-700/60 hover:bg-blue-950/20',
    },
    {
      label: 'Create Invoice',
      path: '/app/invoices',
      icon: Receipt,
      description: 'Bill customer',
      color: 'hover:border-emerald-700/60 hover:bg-emerald-950/20',
    },
    {
      label: 'Record Expense',
      path: '/app/expenses',
      icon: CreditCard,
      description: 'Log expenditure',
      color: 'hover:border-amber-700/60 hover:bg-amber-950/20',
    },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
      <div className="flex items-center gap-2">
        <PlusCircle className="w-4 h-4 text-rose-500 shrink-0" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Quick Actions:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-1">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.label}
              to={act.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-950/70 border border-zinc-800 transition-all text-xs font-semibold text-zinc-200 hover:text-white group ${act.color}`}
            >
              <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-400 shrink-0 transition-colors" />
              <span className="whitespace-nowrap">{act.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
        {onSeedDemoDataset && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSeedDemoDataset}
            isLoading={isSeeding}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-rose-400" />}
            title="Populate authorized test dataset into database"
          >
            Load Sample Data
          </Button>
        )}

        {onRefreshData && (
          <button
            type="button"
            onClick={onRefreshData}
            disabled={isRefreshing}
            aria-label="Refresh business analytics from database"
            title="Refresh database records"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};
