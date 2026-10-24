/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import {
  Building,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { SupabaseAuthService } from '../../services/supabase/auth';
import { getSupabaseEnvConfig } from '../../services/supabase/config';
import { useAuth } from '../../hooks/useAuth';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateFullName,
} from '../../utils/auth-validation';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    requiresVerification: boolean;
    email: string;
  } | null>(null);

  const { status } = getSupabaseEnvConfig();

  // If already authenticated, redirect to workspace
  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent repeated submissions
    setErrorMessage(null);

    // 1. Validate full name
    const nameVal = validateFullName(fullName);
    if (!nameVal.isValid) {
      setErrorMessage(nameVal.error || 'Please provide your full legal name.');
      return;
    }

    // 2. Validate email
    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      setErrorMessage(emailVal.error || 'Please provide a valid business email.');
      return;
    }

    // 3. Validate password
    const pwdVal = validatePassword(password);
    if (!pwdVal.isValid) {
      setErrorMessage(pwdVal.error || 'Password must be at least 8 characters.');
      return;
    }

    // 4. Validate password confirmation
    const matchVal = validatePasswordMatch(password, confirmPassword);
    if (!matchVal.isValid) {
      setErrorMessage(matchVal.error || 'Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service to create your workspace.');
      return;
    }

    setLoading(true);
    const result = await SupabaseAuthService.signUpWithPassword({
      businessName: businessName.trim() || 'My Business Workspace',
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else if (result.requiresEmailVerification) {
      setSuccessInfo({
        requiresVerification: true,
        email: email.trim(),
      });
    } else {
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="lg" showTagline />
          <h2 className="text-xl font-bold text-zinc-100 mt-4">Create your business workspace</h2>
          <p className="text-xs text-zinc-400">
            Set up your organization tenant and provision your operational hub
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {/* Success Confirmation Screen */}
            {successInfo ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-zinc-100">Account Registration Created</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-md mx-auto">
                    A verification email has been dispatched by Supabase to{' '}
                    <strong className="text-rose-400 font-semibold">{successInfo.email}</strong>.
                    Please confirm your email link to finalize workspace activation.
                  </p>
                </div>
                <div className="pt-3 flex flex-col gap-2">
                  <Link to="/sign-in">
                    <Button variant="primary" size="md" className="w-full">
                      Proceed to Sign In
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button variant="ghost" size="sm" className="w-full text-zinc-400">
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {!status.isConfigured && (
                  <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-start gap-2.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">Registration Status</span>
                        <Badge variant="muted" size="sm">
                          Initializing
                        </Badge>
                      </div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        Cloud account registration is being initialized. You can explore the demo workspace or sign in if you already have an active profile.
                      </p>
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

                <form onSubmit={handleSignUp} className="space-y-4">
                  <Input
                    label="Business or Company Name"
                    type="text"
                    placeholder="Acme Industrial Supply"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    leftIcon={<Building className="w-4 h-4" />}
                  />

                  <Input
                    label="Business Owner / Administrator Name"
                    type="text"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="Primary Business Email"
                    type="email"
                    placeholder="jane@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                  />

                  {/* Password Field with Toggle */}
                  <Input
                    label="Security Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
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

                  {/* Confirm Password Field with Toggle */}
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        className="cursor-pointer hover:text-zinc-300 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    required
                  />

                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-1 rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <label htmlFor="agree-terms" className="text-xs text-zinc-400 cursor-pointer select-none">
                      I agree to the Cherryflow Terms of Service and data isolation guidelines.
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    isLoading={loading}
                    disabled={loading}
                  >
                    {loading ? 'Creating Workspace...' : 'Register Business Workspace'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400">
          Already registered?{' '}
          <Link to="/sign-in" className="text-rose-400 hover:underline font-medium">
            Sign in to existing account
          </Link>
        </p>
      </div>
    </div>
  );
};
