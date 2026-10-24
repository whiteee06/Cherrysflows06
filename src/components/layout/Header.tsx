/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, User, Settings, LogOut, Code2, Globe, Shield, UserCheck } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationMenu } from './NotificationMenu';
import { Badge } from '../common/Badge';
import { getPageTitle } from '../../utils/navigation';
import { siteConfig } from '../../config/site';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const title = getPageTitle(location.pathname);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || 'Business User';
  const displayEmail = user?.email || 'admin@cherryflow.internal';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CF';

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    navigate('/sign-in', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: Hamburger & Title & Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation drawer"
          className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight leading-tight truncate">
            {title}
          </h1>
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>
      </div>

      {/* Right side: Phase Badge, Notifications & Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Badge variant="outline" size="sm" className="hidden md:inline-flex border-zinc-800 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
          Live Workspace
        </Badge>

        <NotificationMenu />

        {/* User Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User profile menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-rose-700 flex items-center justify-center text-white font-semibold text-xs shadow-xs">
              {initials}
            </div>
            <span className="text-xs font-medium text-zinc-300 hidden md:block max-w-[120px] truncate">
              {displayName}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-zinc-800">
                <p className="text-xs font-semibold text-zinc-200 truncate">{displayName}</p>
                <p className="text-[11px] text-zinc-400 truncate">{displayEmail}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/app/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <User className="w-4 h-4 text-rose-400" />
                  <span>My Profile & Session</span>
                </Link>

                <Link
                  to="/app/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Workspace Settings</span>
                </Link>

                <Link
                  to="/developer"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <Code2 className="w-4 h-4 text-rose-400" />
                  <span>Developer Profile</span>
                </Link>

                <Link
                  to="/"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <Globe className="w-4 h-4 text-zinc-400" />
                  <span>Public Landing Page</span>
                </Link>
              </div>

              <div className="border-t border-zinc-800 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
