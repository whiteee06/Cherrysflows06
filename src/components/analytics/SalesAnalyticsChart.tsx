/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { TimeSeriesPoint } from '../../types/analytics';
import { formatCurrency } from '../../utils/formatters';

interface SalesAnalyticsChartProps {
  data: TimeSeriesPoint[];
  dateRangeLabel: string;
}

export const SalesAnalyticsChart: React.FC<SalesAnalyticsChartProps> = ({
  data,
  dateRangeLabel,
}) => {
  const totalSalesInRange = data.reduce((acc, curr) => acc + curr.sales, 0);
  const totalOrdersInRange = data.reduce((acc, curr) => acc + curr.orderCount, 0);
  const hasSalesData = totalSalesInRange > 0 || totalOrdersInRange > 0;

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-zinc-100">
                Sales Volume & Velocity
              </CardTitle>
              <CardDescription className="text-xs">
                Realized sales order revenue aggregated across {dateRangeLabel}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Gross Sales: {formatCurrency(totalSalesInRange)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasSalesData ? (
          <div className="h-64 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-zinc-600 mb-2" />
            <h4 className="text-sm font-semibold text-zinc-300">No Sales Orders in Selected Period</h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
              There are no confirmed or fulfilled sales records within this date range. Record a sale to populate time-series analytics.
            </p>
          </div>
        ) : (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cherrySalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val}`)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const point = payload[0].payload as TimeSeriesPoint;
                      return (
                        <div className="p-3 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="text-zinc-400 font-medium">{point.label} ({point.date})</p>
                          <p className="text-rose-400 font-bold text-sm">
                            Sales: {formatCurrency(point.sales)}
                          </p>
                          <p className="text-zinc-400 text-[11px]">
                            Orders placed: {point.orderCount}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cherrySalesGrad)"
                  dot={{ r: 3, fill: '#f43f5e', strokeWidth: 1, stroke: '#18181b' }}
                  activeDot={{ r: 5, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                  name="Sales Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
