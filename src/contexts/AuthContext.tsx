/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseAuthService } from '../services/supabase/auth';
import { getSupabaseEnvConfig } from '../services/supabase/config';
import { Profile } from '../types/database';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isDevSession: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  enterDevSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDevSession, setIsDevSession] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const envConfig = useMemo(() => getSupabaseEnvConfig(), []);
  const isConfigured = envConfig.status.isConfigured;

  const enterDevSession = useCallback(() => {
    try {
      sessionStorage.setItem('cherryflow_dev_session', 'true');
    } catch {}
    setIsDevSession(true);
    setUser({
      id: 'dev_user_001',
      email: 'owner@cherryflow.internal',
      user_metadata: { full_name: 'Business Owner' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as any);
    setProfile({
      id: 'dev_user_001',
      full_name: 'Business Owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, []);

  const loadUserProfile = useCallback(async (userId: string, currentUser?: User | null) => {
    try {
      const { profile: userProfile } = await SupabaseAuthService.getProfile(userId);
      if (userProfile) {
        setProfile(userProfile);
      } else if (currentUser) {
        // Fallback profile if profiles table hasn't migrated yet
        setProfile({
          id: userId,
          full_name: (currentUser.user_metadata?.full_name as string) || null,
          created_at: currentUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    try {
      if (sessionStorage.getItem('cherryflow_dev_session') === 'true') {
        enterDevSession();
        setIsLoading(false);
        return;
      }
    } catch {}

    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // 1. Restore initial session on page mount
    const initializeAuth = async () => {
      try {
        const { session: initialSession, user: initialUser, error: sessionError } =
          await SupabaseAuthService.getSession();

        if (!isMounted) return;

        if (sessionError) {
          setError(sessionError);
        }

        setSession(initialSession);
        setUser(initialUser);

        if (initialUser) {
          await loadUserProfile(initialUser.id, initialUser);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Subscribe to Supabase auth state change events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED)
    const { unsubscribe } = SupabaseAuthService.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user || null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser.id, currentUser);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isConfigured, loadUserProfile]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      sessionStorage.removeItem('cherryflow_dev_session');
    } catch {}
    setIsDevSession(false);
    await SupabaseAuthService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user.id, user);
    }
  }, [user, loadUserProfile]);

  const updateDisplayName = useCallback(
    async (newName: string) => {
      if (!user) {
        return { error: 'No authenticated user session.' };
      }

      const res = await SupabaseAuthService.updateDisplayName(user.id, newName);
      if (!res.error) {
        // Update local state immediately
        setProfile((prev) =>
          prev
            ? { ...prev, full_name: newName, updated_at: new Date().toISOString() }
            : {
                id: user.id,
                full_name: newName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
        );
        setUser((prev) =>
          prev
            ? {
                ...prev,
                user_metadata: {
                  ...prev.user_metadata,
                  full_name: newName,
                },
              }
            : null
        );
      }
      return res;
    },
    [user]
  );

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isConfigured,
      isDevSession,
      error,
      signOut,
      refreshProfile,
      updateDisplayName,
      enterDevSession,
    }),
    [user, session, profile, isLoading, isConfigured, isDevSession, error, signOut, refreshProfile, updateDisplayName, enterDevSession]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
