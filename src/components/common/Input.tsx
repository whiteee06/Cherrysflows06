/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs font-medium text-zinc-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-zinc-500">
              {leftIcon}
            </div>
          )}
          <input
            id={generatedId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-sm px-3.5 py-2.5 placeholder:text-zinc-500 transition-colors',
              'focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500',
              'disabled:bg-zinc-900 disabled:text-zinc-500 disabled:cursor-not-allowed',
              leftIcon ? 'pl-9' : '',
              rightIcon ? 'pr-9' : '',
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-zinc-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-zinc-400 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
