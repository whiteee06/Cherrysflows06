/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BreadcrumbItem } from '../types/navigation';
import { APP_NAV_ITEMS } from '../config/navigation';

export function getPageTitle(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0];

  if (clean === '/' || clean === '') return 'Home';
  if (clean === '/sign-in') return 'Sign In';
  if (clean === '/sign-up') return 'Create Account';
  if (clean === '/forgot-password') return 'Forgot Password';
  if (clean === '/update-password') return 'Update Password';
  if (clean === '/developer') return 'Developer Profile';
  if (clean === '/app/profile') return 'User Profile';

  const match = APP_NAV_ITEMS.find((item) => clean === item.path || clean.startsWith(item.path + '/'));
  if (match) {
    return match.label;
  }

  // Fallback to capitalizing segment
  const segments = clean.split('/').filter(Boolean);
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  return 'Cherryflow';
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const clean = pathname.split('?')[0].split('#')[0];
  const items: BreadcrumbItem[] = [];

  if (clean === '/' || clean === '') {
    return [{ label: 'Home', isCurrent: true }];
  }

  const segments = clean.split('/').filter(Boolean);

  if (segments[0] === 'app') {
    items.push({ label: 'Application', path: '/app/dashboard' });

    if (segments.length === 1) {
      items[0].isCurrent = true;
      return items;
    }

    const currentNav = APP_NAV_ITEMS.find((n) => n.path === `/app/${segments[1]}`);
    if (currentNav) {
      items.push({
        label: currentNav.label,
        path: currentNav.path,
        isCurrent: segments.length === 2,
      });
    } else {
      items.push({
        label: segments[1].charAt(0).toUpperCase() + segments[1].slice(1),
        path: `/app/${segments[1]}`,
        isCurrent: segments.length === 2,
      });
    }

    for (let i = 2; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      items.push({
        label: segments[i].charAt(0).toUpperCase() + segments[i].slice(1),
        path: `/app/${segments.slice(1, i + 1).join('/')}`,
        isCurrent: isLast,
      });
    }
  } else {
    items.push({ label: 'Home', path: '/' });
    const title = getPageTitle(clean);
    items.push({ label: title, isCurrent: true });
  }

  return items;
}

export function isPathActive(currentPath: string, targetPath: string): boolean {
  const cleanCurrent = currentPath.split('?')[0].split('#')[0];
  const cleanTarget = targetPath.split('?')[0].split('#')[0];

  if (cleanTarget === '/' || cleanTarget === '') {
    return cleanCurrent === '/' || cleanCurrent === '';
  }

  return cleanCurrent === cleanTarget || cleanCurrent.startsWith(`${cleanTarget}/`);
}
