/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mail, Phone, ShieldCheck, Code2, Sparkles, ExternalLink, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Badge } from '../common/Badge';
import { siteConfig } from '../../config/site';

interface DeveloperCardProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export const DeveloperCard: React.FC<DeveloperCardProps> = ({
  className = '',
  variant = 'full',
}) => {
  const { name, email, contact, role, bio } = siteConfig.developer;

  if (variant === 'compact') {
    return (
      <Card className={`border-zinc-800 bg-zinc-900/90 ${className}`}>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-sm">
              {name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">{name}</span>
                <Badge variant="cherry" size="sm">Lead Architect</Badge>
              </div>
              <p className="text-xs text-zinc-400">{role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${email}`}
              className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-rose-400" />
              <span>Email</span>
            </a>
            <a
              href={`tel:${contact}`}
              className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-rose-400" />
              <span>Call</span>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950/80 shadow-xl overflow-hidden ${className}`}>
      {/* Accent header bar */}
      <div className="h-2 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700" />
      
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-zinc-800 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xl shadow-inner">
              {name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl font-bold text-zinc-100">{name}</CardTitle>
                <Badge variant="cherry" size="sm">
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  Verified Developer
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="outline" size="sm">
              <Terminal className="w-3 h-3 text-emerald-400 mr-1" />
              Cherryflow Core
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl bg-zinc-950/50 p-3.5 rounded-lg border border-zinc-800/80">
          {bio}
        </p>

        {/* Contact Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Email Clickable mailto: */}
          <a
            href={`mailto:${email}`}
            className="group flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-rose-500/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Direct Email
              </span>
              <span className="block text-sm font-semibold text-zinc-200 group-hover:text-rose-400 transition-colors truncate">
                {email}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-rose-400 transition-colors shrink-0" />
          </a>

          {/* Contact Clickable tel: */}
          <a
            href={`tel:${contact}`}
            className="group flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-rose-500/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Direct Phone
              </span>
              <span className="block text-sm font-semibold text-zinc-200 group-hover:text-rose-400 transition-colors font-mono">
                {contact}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-rose-400 transition-colors shrink-0" />
          </a>
        </div>

        {/* Architecture Standards & Credentials */}
        <div className="border-t border-zinc-800/80 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60">
            <span className="text-[10px] uppercase text-zinc-500 block font-medium">Full-Stack Discipline</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block">React + Supabase</span>
          </div>
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60">
            <span className="text-[10px] uppercase text-zinc-500 block font-medium">Design System</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block">Tailwind + Near-Black</span>
          </div>
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase text-zinc-500 block font-medium">Security & DB</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block">PostgreSQL RLS</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
