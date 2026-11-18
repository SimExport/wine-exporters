import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { formatParisSlot, parisDayStart } from './campaign-queue';

describe('parisDayStart', () => {
  test('winter day starts at 23:00 UTC the day before', () => {
    assert.equal(parisDayStart(new Date('2026-10-29T07:00:00Z')).toISOString(), '2026-10-28T23:00:00.000Z');
  });
  test('summer day starts at 22:00 UTC the day before', () => {
    assert.equal(parisDayStart(new Date('2026-07-15T12:00:00Z')).toISOString(), '2026-07-14T22:00:00.000Z');
  });
});

describe('formatParisSlot', () => {
  test('CET (UTC+1): 09:00Z is the 10:00 Paris slot', () => {
    assert.equal(formatParisSlot('2026-11-18T09:00:00Z'), '18/11/2026 10:00');
  });
  test('CET: 14:00Z is the 15:00 Paris slot', () => {
    assert.equal(formatParisSlot('2026-11-18T14:00:00Z', 'en'), '18/11/2026 15:00');
  });
  test('CEST (UTC+2): 08:00Z is the 10:00 Paris slot', () => {
    assert.equal(formatParisSlot('2026-07-15T08:00:00Z'), '15/07/2026 10:00');
  });
  test('CEST: 13:00Z is the 15:00 Paris slot', () => {
    assert.equal(formatParisSlot('2026-07-15T13:00:00Z'), '15/07/2026 15:00');
  });
  test('missing or invalid slot shows nothing', () => {
    assert.equal(formatParisSlot(null), null);
    assert.equal(formatParisSlot('nope'), null);
  });
});
