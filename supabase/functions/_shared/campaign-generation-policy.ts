/** One reserved AI generation per campaign email; manual saves are independent. */
export const MAX_EMAIL_GENERATIONS = 1;

export const canGenerateCampaignEmail = (count: number | null | undefined): boolean =>
  (count ?? 0) < MAX_EMAIL_GENERATIONS;