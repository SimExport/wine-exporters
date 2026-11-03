import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildExportEmailColumns, isUuid, splitEmails } from './contact-emails';

describe('splitEmails', () => {
  test('splits newline-separated historic emails (Chez France)', () => {
    assert.deepEqual(splitEmails('chezfrance@chezfrance.com.br\nsac@chezfrance.com.br'), ['chezfrance@chezfrance.com.br', 'sac@chezfrance.com.br']);
  });
  test('deduplicates case-insensitively and drops invalid parts', () => {
    assert.deepEqual(splitEmails(' A@x.com ;a@X.com, nope\r\nb@y.org'), ['A@x.com', 'b@y.org']);
  });
});

describe('buildExportEmailColumns', () => {
  test('keeps first address as primary and moves the rest to additional', () => {
    const r = buildExportEmailColumns('chezfrance@chezfrance.com.br\nsac@chezfrance.com.br', null);
    assert.equal(r.email, 'chezfrance@chezfrance.com.br');
    assert.equal(r.emails_additionnels, 'sac@chezfrance.com.br');
  });
  test('deduplicates across primary, additional and decision makers', () => {
    const r = buildExportEmailColumns('info@a.com', {
      additional_emails: ['info@a.com', 'sales@a.com', 'boss@a.com'],
      decision_makers: ['Jane Doe (CEO)'],
      decision_maker_emails: ['boss@a.com', 'INFO@a.com'],
    });
    assert.equal(r.emails_additionnels, 'sales@a.com');
    assert.equal(r.emails_decideurs, 'boss@a.com');
    assert.equal(r.decideurs, 'Jane Doe (CEO)');
  });
});

test('isUuid', () => {
  assert.equal(isUuid('6aab5e90-8738-44e3-a797-fe789f32333c'), true);
  assert.equal(isUuid("1' or 1=1"), false);
});
