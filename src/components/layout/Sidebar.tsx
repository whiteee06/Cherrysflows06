/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  ShoppingBag,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  Code2,
  Database,
  ExternalLink,
  X,
  LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { Badge } from '../common/Badge';
import { APP_NAV_ITEMS } from '../../config/navigation';
import { getSupabaseEnvConfig } from '../../services/supabase/config';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  ShoppingBag,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { status } = getSupabaseEnvConfig();
  const { user, profile } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Branding */}
        <div className="h-16 px-5 border-b border-zinc-800/80 flex items-center justify-between">
          <BrandLogo size="md" showTagline />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Operations & Management
            </span>
          </div>

          {APP_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-800/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-rose-500' : 'text-zinc-400 group-hover:text-zinc-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant={item.badgeVariant || 'muted'} size="sm">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Database & Developer Status Footer */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2 bg-zinc-950/80">
          {/* User profile quick link */}
          <NavLink
            to="/app/profile"
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-600 to-rose-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate leading-tight">
                {profile?.full_name || 'My Profile'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate leading-tight">
                {user?.email || 'admin@cherryflow.internal'}
              </p>
            </div>
          </NavLink>

          {/* Cloud sync status indicator */}
          <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-rose-500" />
                Cloud Database
              </span>
              <Badge variant={status.isConfigured ? 'success' : 'muted'} size="sm">
                {status.isConfigured ? 'Online' : 'Active'}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {status.isConfigured ? 'Real-time synchronization active' : 'Workspace storage active'}
            </p>
          </div>

          {/* Developer shortcut */}
          <NavLink
            to="/developer"
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex items-center justify-between p-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-rose-400" />
              <span>Architect: <strong className="text-zinc-200">{siteConfig.developer.name}</strong></span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
          </NavLink>
        </div>
      </aside>
    </>
  );
};
