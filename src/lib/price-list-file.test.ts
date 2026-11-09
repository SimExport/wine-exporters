import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validatePriceListFile, priceListStoragePath, PRICE_LIST_MAX_BYTES } from './price-list-file.ts';

test('accepts PDF/XLS/XLSX/CSV even with empty or generic MIME', () => {
  assert.equal(validatePriceListFile({ name: 'Tarifs.PDF', size: 10, type: '' }), null);
  assert.equal(validatePriceListFile({ name: 'p.xlsx', size: 10, type: 'application/octet-stream' }), null);
  assert.equal(validatePriceListFile({ name: 'p.xls', size: 10, type: 'application/vnd.ms-excel' }), null);
  assert.equal(validatePriceListFile({ name: 'p.csv', size: 10, type: 'text/plain' }), null);
});

test('rejects other extensions and mismatched MIME', () => {
  assert.equal(validatePriceListFile({ name: 'p.exe', size: 10, type: '' }), 'wrong_type');
  assert.equal(validatePriceListFile({ name: 'p.docx', size: 10, type: 'application/pdf' }), 'wrong_type');
  assert.equal(validatePriceListFile({ name: 'p.pdf', size: 10, type: 'text/html' }), 'wrong_type');
});

test('enforces 15 MB max', () => {
  assert.equal(validatePriceListFile({ name: 'p.pdf', size: 15 * 1024 * 1024, type: 'application/pdf' }), null);
  assert.equal(validatePriceListFile({ name: 'p.pdf', size: PRICE_LIST_MAX_BYTES + 1, type: 'application/pdf' }), 'too_large');
});

test('builds a safe path under user/price_list', () => {
  assert.equal(priceListStoragePath('u1', 'Liste prix été 2026.xlsx', '123'), 'u1/price_list/123_Liste_prix_ete_2026.xlsx');
});
