/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent } from '../../components/common/Card';
import { SupabaseAuthService } from '../../services/supabase/auth';
import { validateEmail } from '../../utils/auth-validation';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await SupabaseAuthService.sendPasswordResetEmail(email);
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="lg" showTagline />
          <h2 className="text-xl font-bold text-zinc-100 mt-4">Reset your password</h2>
          <p className="text-xs text-zinc-400">
            Enter your email and we will send instructions to regain access
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-zinc-100">Recovery Email Dispatched</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    If an account is associated with <span className="text-zinc-200 font-medium">{email}</span>, a secure password reset link has been dispatched.
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/sign-in">
                    <Button variant="secondary" size="md" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                      Return to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="font-medium leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="user@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={loading}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  Send Recovery Instructions
                </Button>

                <div className="pt-2 text-center">
                  <Link
                    to="/sign-in"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
