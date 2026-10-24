/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Scale, AlertCircle } from 'lucide-react';
import { TimeSeriesPoint } from '../../types/analytics';
import { formatCurrency } from '../../utils/formatters';

interface RevenueExpenseChartProps {
  data: TimeSeriesPoint[];
  dateRangeLabel: string;
}

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({
  data,
  dateRangeLabel,
}) => {
  const totalRev = data.reduce((acc, curr) => acc + curr.sales, 0);
  const totalExp = data.reduce((acc, curr) => acc + curr.expenses, 0);
  const hasData = totalRev > 0 || totalExp > 0;

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-zinc-100">
                Revenue vs Operating Expenses
              </CardTitle>
              <CardDescription className="text-xs">
                Comparison of realized sales revenue against recorded disbursements ({dateRangeLabel})
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-zinc-400" />
              <span>Expenses</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!hasData ? (
          <div className="h-64 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-zinc-600 mb-2" />
            <h4 className="text-sm font-semibold text-zinc-300">No Financial Records in Selected Range</h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
              No revenue or expense records exist within this timeframe. Add transactions to analyze profitability.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      const margin = point.sales > 0 ? ((point.netProfit / point.sales) * 100).toFixed(1) : '0';
                      return (
                        <div className="p-3 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-xl text-xs space-y-1.5">
                          <p className="text-zinc-400 font-medium">{point.label} ({point.date})</p>
                          <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold">
                            <span>Revenue:</span>
                            <span>{formatCurrency(point.sales)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-zinc-300 font-semibold">
                            <span>Expenses:</span>
                            <span>{formatCurrency(point.expenses)}</span>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between gap-4 font-bold text-zinc-100">
                            <span>Net Balance:</span>
                            <span className={point.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {formatCurrency(point.netProfit)} ({margin}%)
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px', color: '#a1a1aa' }}
                />
                <Bar dataKey="sales" name="Sales Revenue" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expenses" name="Operating Expenses" fill="#71717a" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
