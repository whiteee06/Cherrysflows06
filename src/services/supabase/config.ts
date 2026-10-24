/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupabaseConfigStatus } from '../../types/database';

export function getSupabaseEnvConfig() {
  const envSource =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env
      : typeof process !== 'undefined' && process.env
      ? process.env
      : {};

  const url = (envSource.VITE_SUPABASE_URL || '').trim();
  const anonKey = (envSource.VITE_SUPABASE_ANON_KEY || '').trim();

  const hasUrl = Boolean(url && url.length > 0 && !url.includes('your-project'));
  const hasAnonKey = Boolean(anonKey && anonKey.length > 0 && !anonKey.includes('your-anon-key'));

  const isConfigured = hasUrl && hasAnonKey;

  let urlPreview: string | undefined;
  if (hasUrl) {
    try {
      const parsed = new URL(url);
      urlPreview = `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      urlPreview = url.slice(0, 15) + '...';
    }
  }

  const message = isConfigured
    ? 'Supabase environment variables detected. Ready for connection handshake.'
    : !hasUrl && !hasAnonKey
    ? 'Supabase is not yet configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    : !hasUrl
    ? 'VITE_SUPABASE_URL is missing. Please provide your Supabase project URL.'
    : 'VITE_SUPABASE_ANON_KEY is missing. Please provide your public anon key.';

  const status: SupabaseConfigStatus = {
    isConfigured,
    hasUrl,
    hasAnonKey,
    urlPreview,
    connectionState: isConfigured ? 'connecting' : 'unconfigured',
    message,
  };

  return {
    url,
    anonKey,
    status,
  };
}
