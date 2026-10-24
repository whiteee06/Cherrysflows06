/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { SupabaseAuthService } from '../../services/supabase/auth';
import { getSupabaseEnvConfig } from '../../services/supabase/config';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail } from '../../utils/auth-validation';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, enterDevSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { status } = getSupabaseEnvConfig();

  // Determine redirect destination if user was redirected from a protected route
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/app/dashboard';

  // If already logged in, redirect immediately
  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent repeated submissions
    setErrorMessage(null);

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      setErrorMessage(emailVal.error || 'Please enter a valid business email.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setLoading(true);
    const result = await SupabaseAuthService.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (result.error) {
      // Map Supabase error responses to friendly feedback
      if (result.error.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('Invalid email or password. Please verify your credentials and try again.');
      } else if (result.error.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('Email address has not been verified yet. Please check your inbox for the confirmation link.');
      } else {
        setErrorMessage(result.error);
      }
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="lg" showTagline />
          <h2 className="text-xl font-bold text-zinc-100 mt-4">Sign in to your business workspace</h2>
          <p className="text-xs text-zinc-400">
            Access financial ledgers, inventory, and operational metrics
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {/* Secure Sign In Indicator */}
            {!status.isConfigured && (
              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Workspace Access</span>
                    <Badge variant="muted" size="sm">
                      Demo Ready
                    </Badge>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Live cloud authentication is initializing. You can access the evaluation workspace directly to review commercial features.
                  </p>
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        enterDevSession();
                        navigate(from, { replace: true });
                      }}
                    >
                      Explore Demo Workspace
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-medium">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                label="Business Email"
                type="email"
                placeholder="owner@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <div className="space-y-1.5">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="cursor-pointer hover:text-zinc-300 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-zinc-400 hover:text-rose-400 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={loading}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-zinc-800 w-full" />
                <span className="bg-zinc-900 px-2 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  or
                </span>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full text-xs"
                onClick={() => {
                  enterDevSession();
                  navigate(from, { replace: true });
                }}
              >
                Explore Workspace & Analytics Demo
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400">
          Don't have an organization workspace?{' '}
          <Link to="/sign-up" className="text-rose-400 hover:underline font-medium">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
};
