/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  Key,
  Calendar,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  IdCard,
  Edit2,
  Save,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { validateFullName } from '../../utils/auth-validation';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, session, signOut, updateDisplayName } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newFullName, setNewFullName] = useState(profile?.full_name || (user?.user_metadata?.full_name as string) || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(false);

    const val = validateFullName(newFullName);
    if (!val.isValid) {
      setNameError(val.error || 'Please enter a valid name.');
      return;
    }

    setSavingName(true);
    const result = await updateDisplayName(newFullName.trim());
    setSavingName(false);

    if (result.error) {
      setNameError(result.error);
    } else {
      setNameSuccess(true);
      setIsEditingName(false);
      setTimeout(() => setNameSuccess(false), 3000);
    }
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setIsSignOutModalOpen(false);
    navigate('/sign-in', { replace: true });
  };

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || 'Business User';
  const email = user?.email || 'user@cherryflow.internal';
  const userId = user?.id || '—';
  const createdAt = profile?.created_at || user?.created_at || new Date().toISOString();
  const lastSignIn = user?.last_sign_in_at || 'Current session';

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-100">User Profile & Account</h2>
            <Badge variant="cherry" size="sm">Auth Management</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your personal profile, credentials, and Supabase active session.
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsSignOutModalOpen(true)}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Sign Out of Workspace
        </Button>
      </div>

      {nameSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Display name updated and synchronized with Supabase profile table.</span>
        </div>
      )}

      {/* Main Profile Summary Card */}
      <Card className="border-zinc-800 bg-zinc-900/90">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-700 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-rose-950/50">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-zinc-100">{displayName}</h3>
                  <Badge variant="success" size="sm">
                    Active Session
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{email}</span>
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsEditingName(!isEditingName);
                setNewFullName(displayName);
              }}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              {isEditingName ? 'Cancel Edit' : 'Edit Display Name'}
            </Button>
          </div>

          {/* Edit Display Name Form */}
          {isEditingName && (
            <form onSubmit={handleUpdateName} className="py-4 space-y-3 max-w-md">
              <Input
                label="Full Display Name"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Jane Doe"
                error={nameError || undefined}
                required
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={savingName}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Profile Changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Account Information Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-xs">
            <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <IdCard className="w-4 h-4 text-rose-500" />
                <span className="font-medium">User Identifier (auth.users UUID)</span>
              </div>
              <p className="font-mono text-zinc-200 text-[11px] truncate">{userId}</p>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4 text-rose-500" />
                <span className="font-medium">Account Creation Date</span>
              </div>
              <p className="text-zinc-200">{formatDate(createdAt, true)}</p>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="w-4 h-4 text-rose-500" />
                <span className="font-medium">Last Authentication</span>
              </div>
              <p className="text-zinc-200">{formatDate(lastSignIn, true)}</p>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <Shield className="w-4 h-4 text-rose-500" />
                <span className="font-medium">Session Persistence</span>
              </div>
              <p className="text-emerald-400 font-medium">Persistent (LocalStorage with auto-refresh)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Sign Out Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        title="Sign Out of Cherryflow"
        description="Are you sure you want to end your authenticated session on this device?"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSignOutModalOpen(false)}
              disabled={isSigningOut}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmSignOut}
              isLoading={isSigningOut}
            >
              Sign Out
            </Button>
          </>
        }
      >
        <p className="text-xs text-zinc-400 leading-relaxed">
          Your current session token will be revoked with Supabase Auth, and you will be returned to the sign-in portal.
        </p>
      </Modal>
    </div>
  );
};
