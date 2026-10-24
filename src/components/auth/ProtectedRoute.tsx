/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, Database, RefreshCw, Key, ArrowRight, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Badge } from '../common/Badge';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading, isConfigured, enterDevSession } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-zinc-200">Verifying Supabase Session</p>
            <p className="text-xs text-zinc-500">Checking authenticated token and user profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // If already authenticated (or in dev session), proceed to workspace
  if (user) {
    return <Outlet />;
  }

  // If unconfigured and not signed in, show clean, friendly workspace setup message without technical credentials
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/90 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <CardTitle className="text-base text-zinc-100">
                Workspace Setup in Progress
              </CardTitle>
            </div>
            <CardDescription>
              This commercial workspace is currently being initialized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-xs text-zinc-300">
            <p className="leading-relaxed text-zinc-400">
              Your workspace is being set up. Please try again shortly, or contact your workspace administrator to grant your account access.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="ghost" size="sm" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
                  Return to Home
                </Button>
              </Link>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={enterDevSession}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Demo Workspace
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If unauthenticated, redirect to sign-in preserving target location in state
  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Authenticated user: render protected child routes
  return <Outlet />;
};
