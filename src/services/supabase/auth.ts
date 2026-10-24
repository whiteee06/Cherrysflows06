/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { getSupabaseEnvConfig } from './config';
import { AuthUser, SignInCredentials, SignUpData } from '../../types/auth';
import { Profile } from '../../types/database';

export class SupabaseAuthService {
  public static isConfigured(): boolean {
    return getSupabaseEnvConfig().status.isConfigured;
  }

  public static async getSession(): Promise<{
    session: Session | null;
    user: User | null;
    error: string | null;
  }> {
    if (!this.isConfigured()) {
      return { session: null, user: null, error: null };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { session: null, user: null, error: 'Supabase client unavailable.' };
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) {
        return { session: null, user: null, error: error.message };
      }
      return { session: data.session, user: data.session?.user || null, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { session: null, user: null, error: msg };
    }
  }

  public static onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { unsubscribe: () => void } {
    const client = getSupabaseClient();
    if (!client) {
      return { unsubscribe: () => {} };
    }

    const { data: listener } = client.auth.onAuthStateChange(callback);
    return {
      unsubscribe: () => {
        listener.subscription.unsubscribe();
      },
    };
  }

  public static async signInWithPassword(credentials: SignInCredentials): Promise<{
    user: AuthUser | null;
    session: Session | null;
    error: string | null;
  }> {
    if (!this.isConfigured()) {
      return {
        user: null,
        session: null,
        error:
          'Supabase credentials are not configured in environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live authentication.',
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { user: null, session: null, error: 'Supabase client failed to initialize.' };
    }

    if (!credentials.email || !credentials.password) {
      return { user: null, session: null, error: 'Both email and password are required.' };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, session: null, error: 'User record not returned by Supabase.' };
    }

    // Ensure profile row exists
    await this.ensureProfile(data.user);

    return {
      user: {
        id: data.user.id,
        email: data.user.email || credentials.email,
        fullName: (data.user.user_metadata?.full_name as string) || undefined,
        lastSignInAt: data.user.last_sign_in_at,
      },
      session: data.session,
      error: null,
    };
  }

  public static async signUpWithPassword(data: SignUpData): Promise<{
    user: AuthUser | null;
    session: Session | null;
    requiresEmailVerification: boolean;
    error: string | null;
  }> {
    if (!this.isConfigured()) {
      return {
        user: null,
        session: null,
        requiresEmailVerification: false,
        error:
          'Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable user registrations.',
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        user: null,
        session: null,
        requiresEmailVerification: false,
        error: 'Supabase client failed to initialize.',
      };
    }

    if (!data.email || !data.password) {
      return {
        user: null,
        session: null,
        requiresEmailVerification: false,
        error: 'Email and password are required.',
      };
    }

    const { data: authData, error } = await client.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          business_name: data.businessName,
        },
        emailRedirectTo: `${window.location.origin}/app/dashboard`,
      },
    });

    if (error) {
      return {
        user: null,
        session: null,
        requiresEmailVerification: false,
        error: error.message,
      };
    }

    const requiresEmailVerification = Boolean(
      authData.user && (!authData.session || !authData.user.confirmed_at)
    );

    if (authData.user) {
      await this.ensureProfile(authData.user, data.fullName);
    }

    return {
      user: authData.user
        ? {
            id: authData.user.id,
            email: authData.user.email || data.email,
            fullName: data.fullName,
          }
        : null,
      session: authData.session,
      requiresEmailVerification,
      error: null,
    };
  }

  public static async sendPasswordResetEmail(email: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error:
          'Supabase is not configured yet. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable password recovery.',
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase client failed to initialize.' };
    }

    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  public static async updateUserPassword(newPassword: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured in environment variables.',
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase client failed to initialize.' };
    }

    const { error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  public static async getProfile(userId: string): Promise<{
    profile: Profile | null;
    error: string | null;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return { profile: null, error: 'Supabase client unavailable.' };
    }

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return { profile: null, error: error.message };
      }

      return { profile: data as Profile | null, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { profile: null, error: msg };
    }
  }

  public static async updateDisplayName(
    userId: string,
    fullName: string
  ): Promise<{ error: string | null }> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Supabase client unavailable.' };
    }

    try {
      // 1. Update auth metadata
      const { error: authError } = await client.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (authError) {
        return { error: authError.message };
      }

      // 2. Update profiles table
      const { error: profileError } = await client
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        // Log warning if table does not exist or trigger handled it
        console.warn('Profile table upsert note:', profileError.message);
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  }

  private static async ensureProfile(user: User, fallbackName?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const fullName =
        (user.user_metadata?.full_name as string) || fallbackName || '';

      await client.from('profiles').upsert(
        {
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      // Non-blocking fallback if public.profiles migration has not been applied yet
      console.warn('ensureProfile non-blocking exception:', err);
    }
  }

  public static async signOut(): Promise<{ error: string | null }> {
    const client = getSupabaseClient();
    if (!client) return { error: null };

    const { error } = await client.auth.signOut();
    return { error: error ? error.message : null };
  }
}
