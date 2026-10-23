import { describe, expect, test } from 'bun:test'
import { hasRequiredCampaign, resolveProspectCampaign } from './prospect-source'

describe('CRM prospect source', () => {
  test('manual needs no selected campaign and uses the private container', async () => {
    expect(hasRequiredCampaign('manual', '')).toBe(true)
    expect(await resolveProspectCampaign('manual', 'stale-campaign', async () => 'private-container')).toBe('private-container')
  })
  test('opportunity needs no selected campaign and uses the private container', async () => {
    expect(hasRequiredCampaign('opportunity', '')).toBe(true)
    expect(await resolveProspectCampaign('opportunity', '', async () => 'private-container')).toBe('private-container')
  })
  test('custom search needs no selected campaign and uses the private container', async () => {
    expect(hasRequiredCampaign('sourcing', '')).toBe(true)
    expect(await resolveProspectCampaign('sourcing', '', async () => 'private-container')).toBe('private-container')
  })
  test('campaign source requires and preserves the selected campaign', async () => {
    expect(hasRequiredCampaign('campaign', '')).toBe(false)
    expect(hasRequiredCampaign('campaign', 'selected-campaign')).toBe(true)
    await expect(resolveProspectCampaign('campaign', '', async () => 'private-container')).rejects.toThrow('Campaign required')
    expect(await resolveProspectCampaign('campaign', 'selected-campaign', async () => { throw new Error('Must not create container') })).toBe('selected-campaign')
  })
})