import { describe, expect, test } from 'bun:test';
import { buildExportEmailColumns, isUuid, splitEmails } from './contact-emails';

describe('splitEmails', () => {
  test('splits newline-separated historic emails (Chez France)', () => {
    expect(splitEmails('chezfrance@chezfrance.com.br\nsac@chezfrance.com.br')).toEqual(['chezfrance@chezfrance.com.br', 'sac@chezfrance.com.br']);
  });
  test('deduplicates case-insensitively and drops invalid parts', () => {
    expect(splitEmails(' A@x.com ;a@X.com, nope\r\nb@y.org')).toEqual(['A@x.com', 'b@y.org']);
  });
});

describe('buildExportEmailColumns', () => {
  test('keeps first address as primary and moves the rest to additional', () => {
    const r = buildExportEmailColumns('chezfrance@chezfrance.com.br\nsac@chezfrance.com.br', null);
    expect(r.email).toBe('chezfrance@chezfrance.com.br');
    expect(r.emails_additionnels).toBe('sac@chezfrance.com.br');
  });
  test('deduplicates across primary, additional and decision makers', () => {
    const r = buildExportEmailColumns('info@a.com', {
      additional_emails: ['info@a.com', 'sales@a.com', 'boss@a.com'],
      decision_makers: ['Jane Doe (CEO)'],
      decision_maker_emails: ['boss@a.com', 'INFO@a.com'],
    });
    expect(r.emails_additionnels).toBe('sales@a.com');
    expect(r.emails_decideurs).toBe('boss@a.com');
    expect(r.decideurs).toBe('Jane Doe (CEO)');
  });
});

test('isUuid', () => {
  expect(isUuid('6aab5e90-8738-44e3-a797-fe789f32333c')).toBe(true);
  expect(isUuid("1' or 1=1")).toBe(false);
});
