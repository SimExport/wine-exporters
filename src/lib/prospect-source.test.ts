import { describe, test } from 'node:test'
import { strict as assert } from 'node:assert'
import { hasRequiredCampaign, resolveProspectCampaign } from './prospect-source'

describe('CRM prospect source', () => {
  test('manual needs no selected campaign and uses the private container', async () => {
    assert.equal(hasRequiredCampaign('manual', ''), true)
    assert.equal(await resolveProspectCampaign('manual', 'stale-campaign', async () => 'private-container'), 'private-container')
  })
  test('opportunity needs no selected campaign and uses the private container', async () => {
    assert.equal(hasRequiredCampaign('opportunity', ''), true)
    assert.equal(await resolveProspectCampaign('opportunity', '', async () => 'private-container'), 'private-container')
  })
  test('custom search needs no selected campaign and uses the private container', async () => {
    assert.equal(hasRequiredCampaign('sourcing', ''), true)
    assert.equal(await resolveProspectCampaign('sourcing', '', async () => 'private-container'), 'private-container')
  })
  test('campaign source requires and preserves the selected campaign', async () => {
    assert.equal(hasRequiredCampaign('campaign', ''), false)
    assert.equal(hasRequiredCampaign('campaign', 'selected-campaign'), true)
    await assert.rejects(() => resolveProspectCampaign('campaign', '', async () => 'private-container'), /Campaign required/)
    assert.equal(await resolveProspectCampaign('campaign', 'selected-campaign', async () => { throw new Error('Must not create container') }), 'selected-campaign')
  })
})