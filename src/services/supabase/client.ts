/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvConfig } from './config';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey, status } = getSupabaseEnvConfig();

  if (!status.isConfigured) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  message: string;
}> {
  const { status, url } = getSupabaseEnvConfig();

  if (!status.isConfigured) {
    return {
      connected: false,
      message: 'Supabase credentials are not configured in environment variables.',
    };
  }

  const startTime = performance.now();
  try {
    const client = getSupabaseClient();
    if (!client) {
      return {
        connected: false,
        message: 'Could not initialize client with current credentials.',
      };
    }

    // Ping health endpoint or auth session
    const { error } = await client.auth.getSession();
    const latency = Math.round(performance.now() - startTime);

    if (error) {
      return {
        connected: false,
        latencyMs: latency,
        message: `Connection handshake failed: ${error.message}`,
      };
    }

    return {
      connected: true,
      latencyMs: latency,
      message: `Successfully reached Supabase at ${url} (${latency}ms)`,
    };
  } catch (err: unknown) {
    const latency = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      latencyMs: latency,
      message: `Network error reaching Supabase endpoint: ${message}`,
    };
  }
}
