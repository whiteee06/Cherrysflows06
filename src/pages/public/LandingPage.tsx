/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Database,
  BarChart2,
  Users,
  Package,
  Boxes,
  Receipt,
  CreditCard,
  Layers,
  Terminal,
  CheckCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { DeveloperCard } from '../../components/developer/DeveloperCard';
import { siteConfig } from '../../config/site';

export const LandingPage: React.FC = () => {

  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="font-semibold text-rose-400">Enterprise Business Suite</span>
          <span className="text-zinc-500">&bull;</span>
          <span className="text-zinc-400">Manage. Automate. Grow.</span>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Manage. Automate.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-rose-600">
              Grow.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
            The production-grade Business Management SaaS engineered for small businesses. Streamline customers, inventory, sales orders, invoices, and operating expenses with architectural rigor.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to="/app/dashboard">
            <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Business Workspace
            </Button>
          </Link>
          <Link to="/developer">
            <Button variant="secondary" size="lg" leftIcon={<ShieldCheck className="w-4 h-4 text-rose-400" />}>
              Developer Information
            </Button>
          </Link>
        </div>

        {/* Architectural Trust Badges */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Zero Fake Business Data</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Typed Supabase PostgreSQL</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Strict Access & RLS Ready</span>
          </div>
        </div>
      </section>

      {/* Platform Architecture & Preview Matrix */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Engineered for Real Business Operations
          </h2>
          <p className="text-sm text-zinc-400">
            Nine unified management modules built on modular components, keyboard-accessible navigation, and scalable data schemas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-zinc-700 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Customer Relationship Hub</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Centralized registry of client accounts, billing addresses, tax identifiers, and communication logs isolated per tenant organization.
              </p>
              <div className="pt-2 text-xs text-zinc-400 font-medium">
                Feature: <span className="text-rose-400">Client CRM & Billing Profiles</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-zinc-700 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Catalog & Stock Control</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                SKU-level inventory accounting with warehouse locations, reorder thresholds, safety stock thresholds, and transaction audits.
              </p>
              <div className="pt-2 text-xs text-zinc-400 font-medium">
                Feature: <span className="text-rose-400">Real-time Stock Tracking & Alerts</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-zinc-700 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Invoicing & Ledger Auditing</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Full lifecycle billing with tax calculations, payment status reconciliation, and expense tracking categorized for financial audits.
              </p>
              <div className="pt-2 text-xs text-zinc-400 font-medium">
                Feature: <span className="text-rose-400">Automated Invoicing & Tax Ledgers</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enterprise Security & Cloud Reliability */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="p-8 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Enterprise Data Security
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-100">
                  Reliable Cloud Infrastructure & Strict Data Isolation
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Cherryflow is architected with enterprise-grade data security, strict tenant isolation, and encrypted sessions. Your business records, financial transactions, and client contacts are protected by modern access controls and resilient cloud storage.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link to="/sign-up">
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Create Business Account
                    </Button>
                  </Link>
                  <Link to="/app/dashboard">
                    <Button variant="outline" size="sm">
                      Access Workspace
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-zinc-400 font-semibold">Security Highlights</span>
                  <Badge variant="success" size="sm">
                    Protected
                  </Badge>
                </div>
                <div className="space-y-3 text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-zinc-100">Row-Level Tenant Isolation</span>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Strict authorization ensures users only access their own business records.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-zinc-100">End-to-End Accounting Precision</span>
                      <p className="text-zinc-400 text-[11px] mt-0.5">All metrics, tax rates, and ledger entries are calculated with exact financial rounding.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-zinc-100">Encrypted Session Tokens</span>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Industry-standard authentication and session refresh mechanisms.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Developer Section on Landing Page */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <Badge variant="cherry" size="sm">Architect & Engineering</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Meet the Software Engineer
          </h2>
          <p className="text-xs text-zinc-400">
            Architected by Nithiarasu with production software standards, accessible UI, and disciplined structure.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <DeveloperCard />
        </div>
      </section>
    </div>
  );
};
