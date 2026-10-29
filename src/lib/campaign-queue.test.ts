import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { estimateSendDate, parisDayStart } from './campaign-queue';

// 2026-10-29 07:00 UTC = Paris (CET, UTC+1) day starting 2026-10-28T23:00Z
const NOW = new Date('2026-10-29T07:00:00Z');

describe('parisDayStart', () => {
  test('winter day starts at 23:00 UTC the day before', () => {
    assert.equal(parisDayStart(NOW).toISOString(), '2026-10-28T23:00:00.000Z');
  });
  test('summer day starts at 22:00 UTC the day before', () => {
    assert.equal(parisDayStart(new Date('2026-07-15T12:00:00Z')).toISOString(), '2026-07-14T22:00:00.000Z');
  });
});

describe('estimateSendDate', () => {
  test('first in queue, quota free → today', () => {
    assert.equal(estimateSendDate(1, false, NOW), '2026-10-29');
  });
  test('first in queue, quota already used → tomorrow', () => {
    assert.equal(estimateSendDate(1, true, NOW), '2026-10-30');
  });
  test('third in queue → +2 days', () => {
    assert.equal(estimateSendDate(3, false, NOW), '2026-10-31');
  });
  test('third in queue with quota used → +3 days', () => {
    assert.equal(estimateSendDate(3, true, NOW), '2026-11-01');
  });
});
