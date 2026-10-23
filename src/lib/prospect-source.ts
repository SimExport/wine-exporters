export const PROSPECT_SOURCES = ['manual', 'campaign', 'opportunity', 'sourcing'] as const
export type ProspectSource = typeof PROSPECT_SOURCES[number]

export function hasRequiredCampaign(source: ProspectSource, campaignId: string): boolean {
  return source !== 'campaign' || campaignId.trim().length > 0
}

/** Non-campaign leads retain the existing private CRM container for ownership. */
export async function resolveProspectCampaign(
  source: ProspectSource,
  campaignId: string,
  getManualContainer: () => Promise<string>,
): Promise<string> {
  if (source === 'campaign') {
    if (!hasRequiredCampaign(source, campaignId)) throw new Error('Campaign required')
    return campaignId
  }
  return getManualContainer()
}