import { describe, it, expect } from 'vitest';
import { validatePriceListFile, priceListStoragePath, PRICE_LIST_MAX_BYTES } from './price-list-file';

describe('validatePriceListFile', () => {
  it('accepts PDF/XLS/XLSX/CSV even with empty or generic MIME', () => {
    expect(validatePriceListFile({ name: 'Tarifs.PDF', size: 10, type: '' })).toBeNull();
    expect(validatePriceListFile({ name: 'p.xlsx', size: 10, type: 'application/octet-stream' })).toBeNull();
    expect(validatePriceListFile({ name: 'p.xls', size: 10, type: 'application/vnd.ms-excel' })).toBeNull();
    expect(validatePriceListFile({ name: 'p.csv', size: 10, type: 'text/plain' })).toBeNull();
  });
  it('rejects other extensions and mismatched MIME', () => {
    expect(validatePriceListFile({ name: 'p.exe', size: 10, type: '' })).toBe('wrong_type');
    expect(validatePriceListFile({ name: 'p.docx', size: 10, type: 'application/pdf' })).toBe('wrong_type');
    expect(validatePriceListFile({ name: 'p.pdf', size: 10, type: 'text/html' })).toBe('wrong_type');
  });
  it('enforces 15 MB max', () => {
    expect(validatePriceListFile({ name: 'p.pdf', size: 15 * 1024 * 1024, type: 'application/pdf' })).toBeNull();
    expect(validatePriceListFile({ name: 'p.pdf', size: PRICE_LIST_MAX_BYTES + 1, type: 'application/pdf' })).toBe('too_large');
  });
  it('builds a safe path under user/price_list', () => {
    expect(priceListStoragePath('u1', 'Liste prix été 2026.xlsx', '123')).toBe('u1/price_list/123_Liste_prix_ete_2026.xlsx');
  });
});
