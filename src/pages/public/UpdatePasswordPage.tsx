/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent } from '../../components/common/Card';
import { SupabaseAuthService } from '../../services/supabase/auth';
import { validatePassword, validatePasswordMatch } from '../../utils/auth-validation';

export const UpdatePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pwdValidation = validatePassword(password);
    if (!pwdValidation.isValid) {
      setErrorMessage(pwdValidation.error || 'Password does not meet security requirements.');
      return;
    }

    const matchValidation = validatePasswordMatch(password, confirmPassword);
    if (!matchValidation.isValid) {
      setErrorMessage(matchValidation.error || 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await SupabaseAuthService.updateUserPassword(password);
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
          <h2 className="text-xl font-bold text-zinc-100 mt-4">Create New Password</h2>
          <p className="text-xs text-zinc-400">
            Secure your Cherryflow business account with a new credentials
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
                  <h3 className="text-base font-semibold text-zinc-100">Password Updated Successfully</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your password has been changed. You may now continue to your business workspace.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => navigate('/app/dashboard')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Go to Workspace Dashboard
                  </Button>
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
                  label="New Password"
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

                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat new password"
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

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={loading}
                >
                  Update Account Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
