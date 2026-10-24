/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfileSettings {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  title_or_role?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export interface BusinessInformation {
  id: string;
  name: string;
  legal_name?: string;
  slug: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  tax_identifier?: string;
  invoice_prefix: string;
  invoice_start_number: number;
  default_payment_terms: 'Due on Receipt' | 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60';
  timezone: string;
}

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY' | 'SGD';
export type SupportedDateFormat = 'MMM DD, YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type SupportedNumberFormat = 'standard' | 'european';

export interface RegionalPreferences {
  currency: SupportedCurrency;
  dateFormat: SupportedDateFormat;
  timezone: string;
  numberFormat: SupportedNumberFormat;
}

export interface NotificationPreferences {
  notify_low_stock: boolean;
  low_stock_threshold: number;
  notify_invoice_due: boolean;
  invoice_due_days_ahead: number;
  notify_payment_received: boolean;
  notify_security_alerts: boolean;
  channel_in_app: boolean;
  channel_email_enabled: boolean; // clearly indicates external gateway status
}

export interface ApplicationPreferences {
  theme: 'charcoal' | 'high_contrast';
  table_density: 'comfortable' | 'compact';
  default_page_size: 10 | 25 | 50;
}

export interface WorkspaceSettingsBundle {
  profile: UserProfileSettings;
  business: BusinessInformation;
  regional: RegionalPreferences;
  notifications: NotificationPreferences;
  application: ApplicationPreferences;
}
