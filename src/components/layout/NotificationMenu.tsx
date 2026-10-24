/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { Badge } from '../common/Badge';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
}

export const NotificationMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Workspace Active',
      message: 'Your commercial business workspace is active and ready for daily operations.',
      timestamp: 'Just now',
      type: 'success',
      read: false,
    },
    {
      id: '2',
      title: 'Enterprise Data Security',
      message: 'Multi-tenant isolation and encrypted session credentials are active.',
      timestamp: '10m ago',
      type: 'info',
      read: false,
    },
    {
      id: '3',
      title: 'Inventory & Billing Monitor',
      message: 'Automated stock tracking and invoice payment reconciliation are online.',
      timestamp: '1h ago',
      type: 'info',
      read: true,
    },
  ]);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="cherry" size="sm">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 flex items-start gap-3 transition-colors ${
                  item.read ? 'bg-zinc-900/60' : 'bg-zinc-800/30'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {item.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
                  {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                    <span className="text-[10px] text-zinc-500 shrink-0">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.message}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500">
              Operational notifications generated by Cherryflow event bus
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
