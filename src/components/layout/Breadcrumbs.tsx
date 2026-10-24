/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getBreadcrumbs } from '../../utils/navigation';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const crumbs = getBreadcrumbs(location.pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-zinc-400">
      <ol className="flex items-center space-x-1.5 flex-wrap">
        {crumbs.map((crumb, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === crumbs.length - 1;

          return (
            <li key={idx} className="flex items-center space-x-1.5">
              {!isFirst && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
              {isLast || !crumb.path ? (
                <span
                  className="font-medium text-zinc-200 truncate max-w-[180px]"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="flex items-center gap-1 hover:text-zinc-200 transition-colors truncate max-w-[150px]"
                >
                  {isFirst && <Home className="w-3 h-3 text-zinc-500" />}
                  <span>{crumb.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
