/**
 * Unified 0-10 scoring scale for lead sources.
 *
 * All prospect scores across the app use /10. Different sources map to
 * different sub-ranges based on the intent signal strength:
 *
 * - interest_form: 6-10  (voluntary form submission = strong intent)
 * - click / open:  4-7   (passive engagement, future ingestion)
 * - sourcing / manual: 1-10 (native full range)
 */
export type LeadSource = 'interest_form' | 'click' | 'sourcing' | string;

export function getScoreRangeForSource(source: LeadSource | null | undefined): { min: number; max: number } {
  switch (source) {
    case 'interest_form':
      return { min: 6, max: 10 };
    case 'click':
    case 'open':
      return { min: 4, max: 7 };
    default:
      return { min: 1, max: 10 };
  }
}

export function clampScoreForSource(score: number, source: LeadSource | null | undefined): number {
  const { min, max } = getScoreRangeForSource(source);
  return Math.min(max, Math.max(min, Math.round(score)));
}