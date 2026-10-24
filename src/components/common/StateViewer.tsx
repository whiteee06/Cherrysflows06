/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, RefreshCw, Layers, Database, Inbox } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
        {icon || <Inbox className="w-6 h-6 text-zinc-400" />}
      </div>
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      <p className="text-xs text-zinc-400 max-w-md mt-1.5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export interface LoadingStateProps {
  rows?: number;
  label?: string;
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  rows = 5,
  label,
  message,
}) => {
  const displayLabel = message || label || 'Loading business records...';
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-48 bg-zinc-800 rounded"></div>
        <div className="h-8 w-24 bg-zinc-800 rounded"></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="h-10 bg-zinc-800/60 border-b border-zinc-800 rounded-t-xl flex items-center px-4 gap-4">
            <div className="h-3 w-16 bg-zinc-700/70 rounded"></div>
            <div className="h-3 w-32 bg-zinc-700/70 rounded"></div>
            <div className="h-3 w-24 bg-zinc-700/70 rounded"></div>
            <div className="h-3 w-20 bg-zinc-700/70 rounded ml-auto"></div>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-3.5 gap-4">
                <div className="h-3.5 w-12 bg-zinc-800 rounded"></div>
                <div className="h-3.5 w-44 bg-zinc-800 rounded"></div>
                <div className="h-3.5 w-28 bg-zinc-800 rounded"></div>
                <div className="h-3.5 w-16 bg-zinc-800 rounded ml-auto"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 py-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
        <span>{label}</span>
      </div>
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  troubleshooting?: string[];
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Encountered Data Operation Error',
  message,
  onRetry,
  troubleshooting,
}) => {
  return (
    <Card className="border-red-900/50 bg-red-950/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-red-900/40 text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm font-semibold text-red-200">{title}</h4>
            <p className="text-xs text-red-300/90 font-mono bg-red-950/40 p-2.5 rounded border border-red-900/40 break-words">
              {message}
            </p>
            {troubleshooting && troubleshooting.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-zinc-300">Troubleshooting Steps:</p>
                <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 mt-1">
                  {troubleshooting.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
            {onRetry && (
              <div className="pt-2">
                <Button variant="danger" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                  Retry Operation
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export type ViewStateMode = 'ready' | 'empty' | 'loading' | 'error';

interface StateControllerBarProps {
  currentMode: ViewStateMode;
  onChangeMode: (mode: ViewStateMode) => void;
  moduleName: string;
}

export const StateControllerBar: React.FC<StateControllerBarProps> = ({
  currentMode,
  onChangeMode,
  moduleName,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs">
      <div className="flex items-center gap-2 text-zinc-400">
        <Layers className="w-4 h-4 text-rose-500" />
        <span className="font-medium text-zinc-300">Phase 1 Architecture Inspector:</span>
        <span className="text-zinc-500 hidden sm:inline">Evaluate UI state resilience for {moduleName}</span>
      </div>
      <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-md border border-zinc-800">
        <button
          type="button"
          onClick={() => onChangeMode('ready')}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
            currentMode === 'ready'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          Schema & Blueprint
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('empty')}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
            currentMode === 'empty'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          Empty State
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('loading')}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
            currentMode === 'loading'
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          Loading State
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('error')}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
            currentMode === 'error'
              ? 'bg-red-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          Error State
        </button>
      </div>
    </div>
  );
};
