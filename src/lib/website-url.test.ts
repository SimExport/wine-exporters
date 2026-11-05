import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { safeWebsiteUrl } from './website-url';
import { safeExternalUrl } from './importer-profile';

test('bare and www domains get https://', () => {
  assert.equal(safeWebsiteUrl('123weine.de'), 'https://123weine.de/');
  assert.equal(safeWebsiteUrl('www.123weine.de'), 'https://www.123weine.de/');
  assert.equal(safeWebsiteUrl('  leons-weinhaus.de/shop  '), 'https://leons-weinhaus.de/shop');
});

test('absolute http(s) URLs are preserved', () => {
  assert.equal(safeWebsiteUrl('https://example.com/about'), 'https://example.com/about');
  assert.equal(safeWebsiteUrl('http://example.com'), 'http://example.com/');
});

test('missing values give no link', () => {
  for (const v of [null, undefined, '', '   ']) assert.equal(safeWebsiteUrl(v), null);
});

test('dangerous schemes, credentials and relative paths are refused', () => {
  for (const v of ['javascript:alert(1)', 'data:text/html,x', 'mailto:a@b.de', 'https://user:pass@example.com', 'user:pass@example.com', '/annuaire', './x', 'not a url', 'ftp://example.com']) {
    assert.equal(safeWebsiteUrl(v), null, v);
  }
});

test('evidence validation stays strict: safeExternalUrl still refuses bare domains', () => {
  assert.equal(safeExternalUrl('123weine.de'), null);
  assert.equal(safeExternalUrl('https://123weine.de'), 'https://123weine.de/');
});
