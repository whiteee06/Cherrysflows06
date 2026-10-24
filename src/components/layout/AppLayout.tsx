/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { siteConfig } from '../../config/site';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex antialiased">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main app viewport container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>{siteConfig.name} &copy; {new Date().getFullYear()}</span>
            <span>&bull;</span>
            <span className="text-zinc-400">{siteConfig.tagline}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Engineered by{' '}
              <Link to="/developer" className="text-zinc-300 hover:text-rose-400 underline transition-colors">
                {siteConfig.developer.name}
              </Link>
            </span>
            <span className="text-zinc-700">|</span>
            <a
              href={`mailto:${siteConfig.developer.email}`}
              className="text-zinc-400 hover:text-rose-400 transition-colors"
            >
              {siteConfig.developer.email}
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
