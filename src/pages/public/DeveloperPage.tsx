/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Phone,
  Code2,
  Terminal,
  Database,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import { DeveloperCard } from '../../components/developer/DeveloperCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { siteConfig } from '../../config/site';

export const DeveloperPage: React.FC = () => {
  const { name, email, contact, role } = siteConfig.developer;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="cherry" size="sm">
            Platform Developer Profile
          </Badge>
          <span className="text-zinc-500 text-xs">&bull;</span>
          <span className="text-zinc-400 text-xs">Official Contact & Engineering Credentials</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
          Developer Information
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Cherryflow is engineered by {name}. Direct inquiries, architectural reviews, and business inquiries can be conducted through the verified communication channels below.
        </p>
      </div>

      {/* Primary Developer Card */}
      <DeveloperCard />

      {/* Engineering Blueprint & Architectural Standards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-rose-500" />
              <CardTitle className="text-base">Engineering Principles</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-zinc-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-100">Strict Data Integrity:</strong> No mocked metrics, no synthetic vanity numbers. Data structures are grounded in PostgreSQL relational foundations.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-100">Near-Black Design System:</strong> Purpose-built for operational fatigue reduction with charcoal surfaces and cherry red accents.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-100">Row Level Security (RLS):</strong> Multi-tenant isolation enforced directly at the database engine tier for enterprise security.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-rose-500" />
              <CardTitle className="text-base">Direct Contact Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-zinc-400">
              Feel free to reach out directly regarding technical implementations or enterprise deployments:
            </p>
            <div className="space-y-2 pt-1">
              <a
                href={`mailto:${email}`}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-rose-500" />
                  <span className="text-zinc-200 font-medium">{email}</span>
                </div>
                <span className="text-[11px] text-zinc-500 group-hover:text-rose-400 transition-colors">
                  Send Email &rarr;
                </span>
              </a>

              <a
                href={`tel:${contact}`}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-rose-500" />
                  <span className="text-zinc-200 font-mono font-medium">{contact}</span>
                </div>
                <span className="text-[11px] text-zinc-500 group-hover:text-rose-400 transition-colors">
                  Call Phone &rarr;
                </span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Return */}
      <div className="pt-4 flex items-center justify-between border-t border-zinc-900">
        <Link to="/">
          <Button variant="ghost" size="sm">
            &larr; Back to Overview
          </Button>
        </Link>
        <Link to="/app/dashboard">
          <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Enter Business Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
