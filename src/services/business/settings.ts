/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from '../supabase/client';
import { getSupabaseEnvConfig } from '../supabase/config';
import {
  WorkspaceSettingsBundle,
  BusinessInformation,
  UserProfileSettings,
  RegionalPreferences,
  NotificationPreferences,
  ApplicationPreferences,
} from '../../types/settings';
import { getDefaultWorkspaceSettings } from '../../utils/settings';
import {
  setActiveCurrency,
  setActiveDateFormat,
  setActiveNumberFormat,
} from '../../utils/formatters';

const LOCAL_STORAGE_SETTINGS_KEY = 'cherryflow_workspace_settings';

export async function fetchWorkspaceSettings(): Promise<{
  settings: WorkspaceSettingsBundle;
  source: 'supabase' | 'local_workspace';
  error: string | null;
}> {
  const defaults = getDefaultWorkspaceSettings();
  let localSaved: Partial<WorkspaceSettingsBundle> = {};

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (raw) {
      localSaved = JSON.parse(raw);
    }
  } catch {}

  const mergedFromLocal: WorkspaceSettingsBundle = {
    profile: { ...defaults.profile, ...(localSaved.profile || {}) },
    business: { ...defaults.business, ...(localSaved.business || {}) },
    regional: { ...defaults.regional, ...(localSaved.regional || {}) },
    notifications: { ...defaults.notifications, ...(localSaved.notifications || {}) },
    application: { ...defaults.application, ...(localSaved.application || {}) },
  };

  const { status } = getSupabaseEnvConfig();
  const client = getSupabaseClient();

  if (!status.isConfigured || !client) {
    // Sync formatting helpers with current state
    setActiveCurrency(mergedFromLocal.regional.currency);
    setActiveDateFormat(mergedFromLocal.regional.dateFormat);
    setActiveNumberFormat(mergedFromLocal.regional.numberFormat);

    return {
      settings: mergedFromLocal,
      source: 'local_workspace',
      error: null,
    };
  }

  try {
    // 1. Fetch current session user
    const {
      data: { session },
    } = await client.auth.getSession();
    const currentUserId = session?.user?.id;
    const currentUserEmail = session?.user?.email;

    // 2. Fetch organization record
    const { data: orgData, error: orgError } = await client
      .from('organizations')
      .select('*')
      .limit(1)
      .maybeSingle();

    // 3. Fetch profile record
    let profileData: any = null;
    if (currentUserId) {
      const { data: userProf } = await client
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const { data: baseProf } = await client
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      profileData = { ...baseProf, ...userProf };
    }

    const resolved: WorkspaceSettingsBundle = {
      profile: {
        ...mergedFromLocal.profile,
        id: profileData?.id || mergedFromLocal.profile.id,
        user_id: currentUserId || mergedFromLocal.profile.user_id,
        email: currentUserEmail || mergedFromLocal.profile.email,
        full_name: profileData?.full_name || mergedFromLocal.profile.full_name,
        title_or_role: profileData?.role || mergedFromLocal.profile.title_or_role,
        phone: profileData?.phone || mergedFromLocal.profile.phone,
        avatar_url: profileData?.avatar_url || mergedFromLocal.profile.avatar_url,
        created_at: profileData?.created_at || mergedFromLocal.profile.created_at,
        last_sign_in_at: session?.user?.last_sign_in_at || undefined,
      },
      business: {
        ...mergedFromLocal.business,
        id: orgData?.id || mergedFromLocal.business.id,
        name: orgData?.name || mergedFromLocal.business.name,
        legal_name: orgData?.legal_name || orgData?.name || mergedFromLocal.business.legal_name,
        slug: orgData?.slug || mergedFromLocal.business.slug,
        email: orgData?.email || mergedFromLocal.business.email,
        phone: orgData?.phone || mergedFromLocal.business.phone,
        address: orgData?.address || mergedFromLocal.business.address,
        website: orgData?.website || mergedFromLocal.business.website,
        tax_identifier: orgData?.tax_identifier || mergedFromLocal.business.tax_identifier,
        invoice_prefix: orgData?.invoice_prefix || mergedFromLocal.business.invoice_prefix,
        invoice_start_number: orgData?.invoice_start_number || mergedFromLocal.business.invoice_start_number,
        default_payment_terms: orgData?.default_payment_terms || mergedFromLocal.business.default_payment_terms,
        timezone: orgData?.timezone || mergedFromLocal.business.timezone,
      },
      regional: {
        currency: (orgData?.currency as any) || mergedFromLocal.regional.currency,
        dateFormat: (orgData?.date_format as any) || mergedFromLocal.regional.dateFormat,
        timezone: orgData?.timezone || mergedFromLocal.regional.timezone,
        numberFormat: (orgData?.number_format as any) || mergedFromLocal.regional.numberFormat,
      },
      notifications: {
        ...mergedFromLocal.notifications,
        notify_low_stock: orgData?.notify_low_stock ?? mergedFromLocal.notifications.notify_low_stock,
        low_stock_threshold: orgData?.low_stock_threshold ?? mergedFromLocal.notifications.low_stock_threshold,
        notify_invoice_due: orgData?.notify_invoice_due ?? mergedFromLocal.notifications.notify_invoice_due,
        notify_payment_received: orgData?.notify_payment_received ?? mergedFromLocal.notifications.notify_payment_received,
        notify_security_alerts: orgData?.notify_security_alerts ?? mergedFromLocal.notifications.notify_security_alerts,
      },
      application: {
        ...mergedFromLocal.application,
        theme: (orgData?.theme as any) || mergedFromLocal.application.theme,
        table_density: (orgData?.table_density as any) || mergedFromLocal.application.table_density,
      },
    };

    // Keep active formatters in sync
    setActiveCurrency(resolved.regional.currency);
    setActiveDateFormat(resolved.regional.dateFormat);
    setActiveNumberFormat(resolved.regional.numberFormat);

    return {
      settings: resolved,
      source: orgData ? 'supabase' : 'local_workspace',
      error: orgError?.message || null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      settings: mergedFromLocal,
      source: 'local_workspace',
      error: msg,
    };
  }
}

export async function persistWorkspaceSettings(
  updated: Partial<WorkspaceSettingsBundle>
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Update local storage bundle for instant responsiveness & offline sync
    const currentRaw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    const existing: WorkspaceSettingsBundle = currentRaw
      ? JSON.parse(currentRaw)
      : getDefaultWorkspaceSettings();

    const merged: WorkspaceSettingsBundle = {
      profile: { ...existing.profile, ...(updated.profile || {}) },
      business: { ...existing.business, ...(updated.business || {}) },
      regional: { ...existing.regional, ...(updated.regional || {}) },
      notifications: { ...existing.notifications, ...(updated.notifications || {}) },
      application: { ...existing.application, ...(updated.application || {}) },
    };

    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(merged));

    // Update global formatter singletons
    if (merged.regional) {
      setActiveCurrency(merged.regional.currency);
      setActiveDateFormat(merged.regional.dateFormat);
      setActiveNumberFormat(merged.regional.numberFormat);
    }

    // 2. Persist to Supabase if configured
    const { status } = getSupabaseEnvConfig();
    const client = getSupabaseClient();

    if (status.isConfigured && client) {
      const {
        data: { session },
      } = await client.auth.getSession();
      const currentUserId = session?.user?.id;

      // Update user profiles
      if (currentUserId && updated.profile) {
        if (updated.profile.full_name) {
          await client.auth.updateUser({
            data: { full_name: updated.profile.full_name.trim() },
          });

          try {
            await client
              .from('profiles')
              .upsert({
                id: currentUserId,
                full_name: updated.profile.full_name.trim(),
                updated_at: new Date().toISOString(),
              });
          } catch {}
        }
      }

      // Update organization settings
      if (updated.business || updated.regional || updated.notifications || updated.application) {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (updated.business?.name) payload.name = updated.business.name;
        if (updated.business?.legal_name) payload.legal_name = updated.business.legal_name;
        if (updated.business?.email) payload.email = updated.business.email;
        if (updated.business?.phone) payload.phone = updated.business.phone;
        if (updated.business?.address) payload.address = updated.business.address;
        if (updated.business?.website) payload.website = updated.business.website;
        if (updated.business?.tax_identifier) payload.tax_identifier = updated.business.tax_identifier;
        if (updated.business?.invoice_prefix) payload.invoice_prefix = updated.business.invoice_prefix;
        if (updated.business?.invoice_start_number) payload.invoice_start_number = updated.business.invoice_start_number;
        if (updated.business?.default_payment_terms) payload.default_payment_terms = updated.business.default_payment_terms;
        if (updated.business?.timezone) payload.timezone = updated.business.timezone;

        if (updated.regional?.currency) payload.currency = updated.regional.currency;
        if (updated.regional?.dateFormat) payload.date_format = updated.regional.dateFormat;
        if (updated.regional?.numberFormat) payload.number_format = updated.regional.numberFormat;

        if (updated.notifications?.notify_low_stock !== undefined) {
          payload.notify_low_stock = updated.notifications.notify_low_stock;
        }
        if (updated.notifications?.low_stock_threshold !== undefined) {
          payload.low_stock_threshold = updated.notifications.low_stock_threshold;
        }
        if (updated.notifications?.notify_invoice_due !== undefined) {
          payload.notify_invoice_due = updated.notifications.notify_invoice_due;
        }
        if (updated.notifications?.notify_payment_received !== undefined) {
          payload.notify_payment_received = updated.notifications.notify_payment_received;
        }
        if (updated.notifications?.notify_security_alerts !== undefined) {
          payload.notify_security_alerts = updated.notifications.notify_security_alerts;
        }

        if (updated.application?.theme) payload.theme = updated.application.theme;
        if (updated.application?.table_density) payload.table_density = updated.application.table_density;

        // Try updating existing organization or insert if none exists
        const { error: orgUpdateErr } = await client
          .from('organizations')
          .update(payload)
          .eq('id', merged.business.id);

        if (orgUpdateErr && orgUpdateErr.code !== 'PGRST116') {
          console.warn('Supabase organization update notice:', orgUpdateErr.message);
        }
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
