/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cherry' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'outline' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'cherry',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    cherry: 'bg-rose-950/60 text-rose-300 border-rose-800/40',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50',
    warning: 'bg-amber-950/80 text-amber-200 border-amber-600/50',
    danger: 'bg-red-950/70 text-red-300 border-red-800/50',
    info: 'bg-sky-950/70 text-sky-300 border-sky-800/50',
    muted: 'bg-zinc-800/90 text-zinc-200 border-zinc-700/70',
    default: 'bg-zinc-800/90 text-zinc-200 border-zinc-700/70',
    outline: 'bg-transparent text-zinc-300 border-zinc-700',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border leading-none whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
