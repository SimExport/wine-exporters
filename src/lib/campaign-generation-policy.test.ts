import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { canGenerateCampaignEmail, MAX_EMAIL_GENERATIONS } from '../../supabase/functions/_shared/campaign-generation-policy';

test('one generation per email: unused allowed, used and historical counts blocked', () => {
  assert.equal(MAX_EMAIL_GENERATIONS, 1);
  assert.equal(canGenerateCampaignEmail(0), true);
  assert.equal(canGenerateCampaignEmail(null), true);
  assert.equal(canGenerateCampaignEmail(1), false);
  assert.equal(canGenerateCampaignEmail(10), false);
});