import type { TFunction } from 'i18next'
import { MANUAL_CAMPAIGN_NAME } from '@/lib/manual-campaign'

export type LeadOriginKey = 'manual' | 'campaign' | 'sourcing' | 'buyerRequest' | 'tender'

export function getLeadOriginKey(source?: string | null): LeadOriginKey {
  switch (source) {
    case 'sourcing':
      return 'sourcing'
    case 'opportunity_direct':
      return 'buyerRequest'
    case 'opportunity_tender':
      return 'tender'
    case 'campaign':
    case 'campaign_interest':
    case 'click':
    case 'interest_form':
      return 'campaign'
    default:
      return 'manual'
  }
}

/** User-facing origin label, with the real campaign name when relevant. */
export function getLeadOriginLabel(
  lead: { source?: string | null; campaigns?: { name?: string | null } | null },
  t: TFunction,
): string {
  const key = getLeadOriginKey(lead.source)
  const label = t(`crm.origin.${key}`)
  const campaignName = lead.campaigns?.name
  if (key === 'campaign' && campaignName && campaignName !== MANUAL_CAMPAIGN_NAME) {
    return `${label} · ${campaignName}`
  }
  return label
}
