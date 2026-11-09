// Shared validation for export price list uploads (profile + campaign creation).
export const PRICE_LIST_MAX_BYTES = 15 * 1024 * 1024;
export const PRICE_LIST_ACCEPT = '.pdf,.xls,.xlsx,.csv';

const EXTENSIONS = ['pdf', 'xls', 'xlsx', 'csv'];
const MIME_TYPES = [
  'application/pdf', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain', 'application/csv', 'text/x-csv', 'application/x-csv',
  'text/comma-separated-values', 'text/x-comma-separated-values',
  'application/excel', 'application/x-excel', 'application/x-msexcel',
];
// Generic types some browsers report for legitimate files; the extension decides.
const GENERIC_TYPES = ['', 'application/octet-stream'];

export type PriceListFileError = 'too_large' | 'wrong_type' | 'empty';

export const fileExtension = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

export function validatePriceListFile(file: { name: string; size: number; type: string }): PriceListFileError | null {
  if (file.size <= 0) return 'empty';
  if (file.size > PRICE_LIST_MAX_BYTES) return 'too_large';
  if (!EXTENSIONS.includes(fileExtension(file.name))) return 'wrong_type';
  const type = (file.type || '').toLowerCase();
  if (!GENERIC_TYPES.includes(type) && !MIME_TYPES.includes(type)) return 'wrong_type';
  return null;
}

export const sanitizeStorageKey = (name: string) => {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const cleanBase = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'file';
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return cleanBase + cleanExt;
};

export const priceListStoragePath = (userId: string, fileName: string, unique: string) =>
  `${userId}/price_list/${unique}_${sanitizeStorageKey(fileName)}`;
