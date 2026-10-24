/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  to = '/',
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base font-semibold',
    md: 'text-xl font-bold tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Cherry Symbol Icon */}
      <div
        className={`${iconSizes[size]} rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-sm shadow-rose-950/50 text-white shrink-0 group-hover:from-rose-400 group-hover:to-rose-600 transition-colors`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4/6 h-4/6"
        >
          {/* Pair of cherries icon */}
          <path d="M4 17a3 3 0 1 0 6 0 3 3 0 1 0-6 0" fill="currentColor" fillOpacity="0.2" />
          <path d="M14 17a3 3 0 1 0 6 0 3 3 0 1 0-6 0" fill="currentColor" fillOpacity="0.2" />
          <path d="M7 14c.5-5 3-9 9-9" />
          <path d="M17 14c-.5-5-3-9-9-9" />
          <path d="M16 5c1-1 3-1 5 0" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`text-zinc-100 ${textSizes[size]} leading-none`}>
          Cherry<span className="text-rose-500">flow</span>
        </span>
        {showTagline && (
          <span className="text-[10px] tracking-wider uppercase font-medium text-zinc-400 mt-1">
            Manage. Automate. Grow.
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-md">
        {content}
      </Link>
    );
  }

  return content;
};
