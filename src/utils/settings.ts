/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BusinessInformation,
  UserProfileSettings,
  RegionalPreferences,
  NotificationPreferences,
  ApplicationPreferences,
  WorkspaceSettingsBundle,
  SupportedCurrency,
  SupportedDateFormat,
  SupportedNumberFormat,
} from '../types/settings';

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; symbol: string; label: string }[] = [
  { code: 'USD', symbol: '$', label: 'USD ($) — United States Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) — Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) — British Pound' },
  { code: 'INR', symbol: '₹', label: 'INR (₹) — Indian Rupee' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD ($) — Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD ($) — Australian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥) — Japanese Yen' },
  { code: 'SGD', symbol: 'S$', label: 'SGD ($) — Singapore Dollar' },
];

export const SUPPORTED_DATE_FORMATS: { format: SupportedDateFormat; example: string }[] = [
  { format: 'MMM DD, YYYY', example: 'Oct 24, 2026' },
  { format: 'DD/MM/YYYY', example: '24/10/2026' },
  { format: 'YYYY-MM-DD', example: '2026-10-24' },
];

export const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export const PAYMENT_TERMS_OPTIONS = [
  'Due on Receipt',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
] as const;

export function getDefaultWorkspaceSettings(): WorkspaceSettingsBundle {
  return {
    profile: {
      id: 'profile_default',
      user_id: 'auth_user_default',
      email: 'owner@cherryflow.internal',
      full_name: 'Business Owner',
      title_or_role: 'Operations Lead & Owner',
      phone: '+91 99522 81794',
      created_at: new Date().toISOString(),
    },
    business: {
      id: 'org_default',
      name: 'Cherryflow Commerce LLC',
      legal_name: 'Cherryflow Commerce Private Limited',
      slug: 'cherryflow-commerce',
      email: 'contact@cherryflow.dev',
      phone: '+91 99522 81794',
      address: '742 Evergreen Industrial Corridor, Tech Zone 4',
      website: 'https://cherryflow.dev',
      tax_identifier: 'GSTIN33AAACR1234F1Z5',
      invoice_prefix: 'INV-',
      invoice_start_number: 1001,
      default_payment_terms: 'Net 30',
      timezone: 'Asia/Kolkata',
    },
    regional: {
      currency: 'USD',
      dateFormat: 'MMM DD, YYYY',
      timezone: 'Asia/Kolkata',
      numberFormat: 'standard',
    },
    notifications: {
      notify_low_stock: true,
      low_stock_threshold: 15,
      notify_invoice_due: true,
      invoice_due_days_ahead: 3,
      notify_payment_received: true,
      notify_security_alerts: true,
      channel_in_app: true,
      channel_email_enabled: false,
    },
    application: {
      theme: 'charcoal',
      table_density: 'comfortable',
      default_page_size: 10,
    },
  };
}

export function validateBusinessInfo(data: Partial<BusinessInformation>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Business name must be at least 2 characters.';
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Please provide a valid business email address.';
  }

  if (data.website && data.website.trim().length > 0) {
    const trimmed = data.website.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      errors.website = 'Website must start with http:// or https://';
    }
  }

  if (!data.invoice_prefix || data.invoice_prefix.trim().length === 0) {
    errors.invoice_prefix = 'Invoice prefix is required (e.g. INV-).';
  } else if (!/^[A-Za-z0-9\-_/]+$/.test(data.invoice_prefix.trim())) {
    errors.invoice_prefix = 'Invoice prefix can only contain letters, numbers, hyphens, and slashes.';
  }

  if (
    data.invoice_start_number === undefined ||
    isNaN(data.invoice_start_number) ||
    data.invoice_start_number < 1
  ) {
    errors.invoice_start_number = 'Starting invoice number must be at least 1.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateProfileSettings(data: Partial<UserProfileSettings>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.full_name = 'Display name must be at least 2 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePasswordChange(
  currentPass: string,
  newPass: string,
  confirmPass: string
): { isValid: boolean; error: string | null } {
  if (!currentPass) {
    return { isValid: false, error: 'Current password is required.' };
  }
  if (!newPass || newPass.length < 8) {
    return { isValid: false, error: 'New password must be at least 8 characters.' };
  }
  if (newPass !== confirmPass) {
    return { isValid: false, error: 'New password and confirmation do not match.' };
  }
  if (currentPass === newPass) {
    return { isValid: false, error: 'New password must be different from current password.' };
  }
  return { isValid: true, error: null };
}

export function formatCurrencyWithSettings(
  amount: number,
  currency: SupportedCurrency = 'USD',
  numberFormat: SupportedNumberFormat = 'standard'
): string {
  if (isNaN(amount)) return '$0.00';

  const locale = numberFormat === 'european' ? 'de-DE' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatDateWithSettings(
  dateInput: string | Date | number,
  formatPattern: SupportedDateFormat = 'MMM DD, YYYY',
  includeTime = false
): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Invalid date';

  const year = d.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[d.getMonth()];
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  let baseDate = '';
  switch (formatPattern) {
    case 'DD/MM/YYYY':
      baseDate = `${day}/${monthNum}/${year}`;
      break;
    case 'YYYY-MM-DD':
      baseDate = `${year}-${monthNum}-${day}`;
      break;
    case 'MMM DD, YYYY':
    default:
      baseDate = `${monthName} ${day}, ${year}`;
      break;
  }

  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${baseDate} ${hours}:${minutes}`;
  }

  return baseDate;
}
