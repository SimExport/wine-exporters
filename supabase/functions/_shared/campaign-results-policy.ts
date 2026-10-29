export function eligibleCampaign(campaign: { status: string; launched_at: string | null; brevo_campaign_id: unknown }, test: boolean, now = Date.now()) {
  return !test && campaign.status === 'active' && !!campaign.brevo_campaign_id && !!campaign.launched_at && Date.parse(campaign.launched_at) <= now - 48 * 60 * 60 * 1000;
}
export function resultFailureStatus(status: number, message: string) {
  if ([400, 401, 402, 403, 404, 422].includes(status) || /refusal|budget exhausted|reconciliation/i.test(message)) return 'paused';
  return 'retry';
}
export function nextResultStage(stage: string, response: { failed?: number; pending?: boolean; remaining?: number; skipped?: boolean; ok?: boolean }) {
  if (response.skipped || response.failed || response.ok === false) throw new Error('Incomplete campaign operation');
  if (stage === 'sync') return response.pending ? 'sync' : 'enrich';
  if (stage === 'enrich') return response.remaining ? 'enrich' : 'notify';
  return 'done';
}