/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  organizationId?: string;
  role?: string;
  lastSignInAt?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}

export interface SignInCredentials {
  email: string;
  password?: string;
  useMagicLink?: boolean;
}

export interface SignUpData {
  businessName: string;
  fullName: string;
  email: string;
  password?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
}
