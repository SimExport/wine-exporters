import { format as fnsFormat, formatDistanceToNow as fnsFormatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import i18n from '@/i18n';

/**
 * Centralized date / number / currency formatters.
 * All UI surfaces (dashboard, admin tables, toasts, CSV exports, etc.)
 * MUST go through these helpers so FR and EN stay perfectly consistent.
 *
 * Conventions:
 * - FR: dates `dd/MM/yyyy`, times `HH:mm`, numbers with non-breaking space + comma (fr-FR), currency `1 234,56 €`.
 * - EN: dates `MM/dd/yyyy`, times `h:mm a`, numbers with comma + dot (en-US), currency `€1,234.56` / `$1,234.56`.
 * - Relative dates use date-fns with locale (e.g. "il y a 3 heures" / "3 hours ago").
 */

type Lang = 'fr' | 'en';

function getLang(): Lang {
  return i18n.language?.startsWith('en') ? 'en' : 'fr';
}

export function getLocaleCode(): 'fr-FR' | 'en-US' {
  return getLang() === 'en' ? 'en-US' : 'fr-FR';
}

export function getDateFnsLocale() {
  return getLang() === 'en' ? enUS : fr;
}

/** Short date: 27/04/2026 (FR) · 04/27/2026 (EN) */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return fnsFormat(d, getLang() === 'en' ? 'MM/dd/yyyy' : 'dd/MM/yyyy', { locale: getDateFnsLocale() });
}

/** Long date: 27 avril 2026 (FR) · April 27, 2026 (EN) */
export function formatDateLong(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(getLocaleCode(), { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Date + time: 27/04/2026 14:30 (FR) · 04/27/2026 2:30 PM (EN) */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return fnsFormat(d, getLang() === 'en' ? 'MM/dd/yyyy h:mm a' : 'dd/MM/yyyy HH:mm', { locale: getDateFnsLocale() });
}

/** Time only: 14:30 (FR) · 2:30 PM (EN) */
export function formatTime(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return fnsFormat(d, getLang() === 'en' ? 'h:mm a' : 'HH:mm', { locale: getDateFnsLocale() });
}

/** Relative: "il y a 3 heures" / "3 hours ago" */
export function formatRelative(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return fnsFormatDistanceToNow(d, { addSuffix: true, locale: getDateFnsLocale() });
}

/** ISO-like file-name date: 2026-04-27 (locale-independent for filenames). */
export function formatDateFile(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  return fnsFormat(d, 'yyyy-MM-dd');
}

/** Plain integer / decimal number with locale grouping. */
export function formatNumber(value: number | null | undefined, options: Intl.NumberFormatOptions = {}): string {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat(getLocaleCode(), options).format(value);
}

/** Currency. Defaults to EUR — supply 'USD' etc. for other currencies. */
export function formatCurrency(
  value: number | null | undefined,
  currency: 'EUR' | 'USD' = 'EUR',
  options: Intl.NumberFormatOptions = {},
): string {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat(getLocaleCode(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}
