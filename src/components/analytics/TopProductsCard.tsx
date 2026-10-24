/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Award, ArrowRight, Layers, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Badge } from '../common/Badge';
import { TopProductItem } from '../../types/analytics';
import { formatCurrency } from '../../utils/formatters';

interface TopProductsCardProps {
  products: TopProductItem[];
  dateRangeLabel: string;
}

export const TopProductsCard: React.FC<TopProductsCardProps> = ({ products, dateRangeLabel }) => {
  const maxRevenue = products.length > 0 ? Math.max(...products.map((p) => p.revenue)) : 1;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <Award className="w-4 h-4" />
            </span>
            Top Performing Products
          </CardTitle>
          <CardDescription>
            Ranked by realized volume and revenue ({dateRangeLabel})
          </CardDescription>
        </div>
        <Link
          to="/app/products"
          className="text-xs text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1 group transition-colors"
        >
          Catalog
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between">
        {products.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-semibold text-zinc-200">No product sales in {dateRangeLabel}</p>
              <p className="text-xs text-zinc-400">
                Products are ranked based on confirmed orders within the selected period.
              </p>
            </div>
            <Link
              to="/app/products"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-rose-500/50 text-xs text-zinc-200 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-rose-400" />
              <span>Add Catalog Product</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5 divide-y divide-zinc-800/60">
            {products.slice(0, 5).map((item) => {
              const percentage = Math.min(100, Math.round((item.revenue / maxRevenue) * 100));

              return (
                <div key={item.id} className="pt-3.5 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          item.rank === 1
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : item.rank === 2
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        #{item.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span className="font-mono">{item.sku}</span>
                          {item.category && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1.5 border-zinc-800 text-zinc-400">
                                {item.category}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-zinc-100">{formatCurrency(item.revenue)}</p>
                      <p className="text-[11px] text-zinc-400">
                        {item.unitsSold} unit{item.unitsSold === 1 ? '' : 's'} sold
                      </p>
                    </div>
                  </div>

                  {/* Visual revenue proportion bar */}
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.rank === 1 ? 'bg-rose-500' : item.rank === 2 ? 'bg-amber-500' : 'bg-zinc-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3 mt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Ranking strictly derived from confirmed sales orders</span>
          <span className="font-mono">{products.length} product{products.length === 1 ? '' : 's'} analyzed</span>
        </div>
      </CardContent>
    </Card>
  );
};
