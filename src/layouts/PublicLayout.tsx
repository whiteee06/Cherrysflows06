/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Mail, Phone, ArrowRight, ShieldCheck, Database, Layers, Sparkles } from 'lucide-react';
import { BrandLogo } from '../components/brand/BrandLogo';
import { Button } from '../components/common/Button';
import { siteConfig } from '../config/site';

export const PublicLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo size="md" showTagline />

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-300">
            <Link
              to="/"
              className={`hover:text-rose-400 transition-colors ${
                location.pathname === '/' ? 'text-zinc-100 font-semibold' : ''
              }`}
            >
              Overview
            </Link>
            <Link
              to="/developer"
              className={`hover:text-rose-400 transition-colors ${
                location.pathname === '/developer' ? 'text-zinc-100 font-semibold' : ''
              }`}
            >
              Developer
            </Link>
            <Link
              to="/app/dashboard"
              className="hover:text-rose-400 transition-colors flex items-center gap-1.5"
            >
              <span>App Workspace</span>
              <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/50 px-1.5 py-0.5 rounded">
                Live
              </span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/app/dashboard">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 text-zinc-400 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-zinc-800/80">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <BrandLogo size="md" showTagline />
              <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                Cherryflow delivers unified operations for small businesses. Designed from first principles with full-stack discipline, real relational database models, and strict zero-slop architecture.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  Cloud Infrastructure
                </span>
                <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  Data Security & Isolation
                </span>
                <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  Real-time Analytics
                </span>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 mb-4">
                Platform Navigation
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/" className="hover:text-rose-400 transition-colors">
                    Platform Overview
                  </Link>
                </li>
                <li>
                  <Link to="/app/dashboard" className="hover:text-rose-400 transition-colors">
                    Business Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/app/customers" className="hover:text-rose-400 transition-colors">
                    Customer Records
                  </Link>
                </li>
                <li>
                  <Link to="/app/inventory" className="hover:text-rose-400 transition-colors">
                    Inventory & Stock
                  </Link>
                </li>
                <li>
                  <Link to="/app/settings" className="hover:text-rose-400 transition-colors">
                    Workspace Settings
                  </Link>
                </li>
              </ul>
            </div>

            {/* Developer Information Card column */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 mb-4">
                Architect Information
              </h4>
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-rose-600/30 text-rose-400 font-bold flex items-center justify-center text-xs">
                    N
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-200">{siteConfig.developer.name}</p>
                    <p className="text-[11px] text-zinc-400">{siteConfig.developer.role}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                  <a
                    href={`mailto:${siteConfig.developer.email}`}
                    className="flex items-center gap-2 text-zinc-300 hover:text-rose-400 transition-colors group"
                  >
                    <Mail className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{siteConfig.developer.email}</span>
                  </a>
                  <a
                    href={`tel:${siteConfig.developer.contact}`}
                    className="flex items-center gap-2 text-zinc-300 hover:text-rose-400 transition-colors group"
                  >
                    <Phone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-mono">{siteConfig.developer.contact}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p className="text-zinc-400">
              &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link to="/developer" className="hover:text-zinc-200 transition-colors">
                Developer Profile
              </Link>
              <Link to="/sign-in" className="hover:text-zinc-200 transition-colors">
                Portal Sign In
              </Link>
              <Link to="/sign-up" className="hover:text-zinc-200 transition-colors">
                Register Workspace
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
