/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtitle: string;
  formulaNote?: string;
  statusBadge?: string;
  badgeVariant?: 'cherry' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  isEmpty?: boolean;
  emptyMessage?: string;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  subtitle,
  formulaNote,
  statusBadge,
  badgeVariant = 'muted',
  isEmpty = false,
  emptyMessage = 'No records in range',
  highlight = false,
}) => {
  return (
    <Card
      className={cn(
        'transition-all border-zinc-800/90 relative overflow-hidden',
        highlight && 'border-rose-900/60 bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950'
      )}
    >
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
      )}

      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-medium text-zinc-400 tracking-wide">{label}</span>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
              highlight
                ? 'bg-rose-950/60 border-rose-800/40 text-rose-400'
                : 'bg-zinc-800/70 border-zinc-700/60 text-zinc-300'
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>

        {isEmpty ? (
          <div className="py-1">
            <span className="text-xl font-semibold text-zinc-500">—</span>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">{emptyMessage}</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-sans">
                {value}
              </span>
              {statusBadge && (
                <Badge variant={badgeVariant} size="sm">
                  {statusBadge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{subtitle}</p>
          </div>
        )}

        {formulaNote && (
          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono">
            {formulaNote}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
