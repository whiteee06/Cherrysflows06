/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getActiveCurrency(): string {
  try {
    return localStorage.getItem('cherryflow_pref_currency') || 'USD';
  } catch {
    return 'USD';
  }
}

export function setActiveCurrency(currency: string): void {
  try {
    localStorage.setItem('cherryflow_pref_currency', currency);
  } catch {}
}

export function getActiveDateFormat(): string {
  try {
    return localStorage.getItem('cherryflow_pref_date_format') || 'MMM DD, YYYY';
  } catch {
    return 'MMM DD, YYYY';
  }
}

export function setActiveDateFormat(format: string): void {
  try {
    localStorage.setItem('cherryflow_pref_date_format', format);
  } catch {}
}

export function getActiveNumberFormat(): string {
  try {
    return localStorage.getItem('cherryflow_pref_number_format') || 'standard';
  } catch {
    return 'standard';
  }
}

export function setActiveNumberFormat(format: string): void {
  try {
    localStorage.setItem('cherryflow_pref_number_format', format);
  } catch {}
}

export function formatCurrency(amount: number, currency?: string): string {
  if (isNaN(amount)) return '$0.00';
  const activeCurrency = currency || getActiveCurrency();
  const activeNumberFormat = getActiveNumberFormat();
  const locale = activeNumberFormat === 'european' ? 'de-DE' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: activeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatPhone(phone: string): string {
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

export function formatDate(
  dateInput: string | Date | number,
  includeTime = false,
  formatPattern?: string
): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Invalid date';

  const pattern = formatPattern || getActiveDateFormat();
  const year = d.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[d.getMonth()];
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  let baseDate = '';
  switch (pattern) {
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

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export function getStatusBadgeVariant(
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const s = status.toLowerCase();
  if (['active', 'paid', 'confirmed', 'connected', 'fulfilled'].includes(s)) {
    return 'success';
  }
  if (['pending', 'draft', 'issued', 'connecting'].includes(s)) {
    return 'warning';
  }
  if (['overdue', 'cancelled', 'voided', 'error', 'unconfigured', 'inactive'].includes(s)) {
    return 'danger';
  }
  if (['info', 'audit', 'review'].includes(s)) {
    return 'info';
  }
  return 'default';
}
