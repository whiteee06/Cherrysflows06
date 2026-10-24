/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { DateRangeKey } from '../../types/analytics';
import { DATE_RANGE_OPTIONS } from '../../utils/analytics';
import { cn } from '../../utils/cn';

interface DateRangeSelectorProps {
  value: DateRangeKey;
  onChange: (range: DateRangeKey) => void;
  className?: string;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div
      role="group"
      aria-label="Filter analytics by date range"
      className={cn(
        'inline-flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xs',
        className
      )}
    >
      <div className="flex items-center pl-2.5 pr-2 py-1 text-zinc-500 hidden sm:flex">
        <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
        <span className="text-[11px] font-medium uppercase tracking-wider">Range:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
        {DATE_RANGE_OPTIONS.map((opt) => {
          const isActive = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              title={opt.description}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500',
                isActive
                  ? 'bg-rose-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
