/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  badge?: string;
  badgeVariant?: 'default' | 'cherry' | 'muted';
  description?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isCurrent?: boolean;
}
