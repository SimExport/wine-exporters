// React-free helpers describing how a campaign must be validated and sent (lot C).

export type CampaignPath = 'custom' | 'legacy';
export type SendState = 'idle' | 'in_progress' | 'uncertain' | 'brevo_draft' | 'failed';

interface CampaignLike {
  status?: string | null;
  email_content?: unknown;
  message_html?: string | null;
  brevo_campaign_id?: number | string | null;
  send_started_at?: string | null;
  send_error?: string | null;
}

/** Custom = prepared with the editor (v2 content + saved HTML). Everything else follows the legacy path. */
export function campaignPath(c: CampaignLike): CampaignPath {
  const v = Number((c.email_content as any)?.version);
  return v === 2 && String(c.message_html ?? '').trim().length > 0 ? 'custom' : 'legacy';
}

/** Send state of a pending campaign. Any lock or Brevo id without going live needs a manual check. */
export function sendState(c: CampaignLike): SendState {
  if (c.status !== 'pending_validation') return 'idle';
  const err = String(c.send_error ?? '');
  if (err === 'brevo_draft') return 'brevo_draft';
  if (err === 'uncertain' || err.startsWith('send_failed')) return 'uncertain';
  if (c.brevo_campaign_id) return 'uncertain';
  if (c.send_started_at) return 'in_progress';
  if (err.startsWith('brevo_create')) return 'failed';
  return 'idle';
}

/** A new send is only allowed when nothing may already exist on Brevo's side. */
export const canStartSend = (c: CampaignLike) => {
  const s = sendState(c);
  return c.status === 'pending_validation' && campaignPath(c) === 'custom' && (s === 'idle' || s === 'failed');
};

export const needsBrevoCheck = (c: CampaignLike) => {
  const s = sendState(c);
  return s === 'uncertain' || s === 'brevo_draft' || s === 'in_progress';
};
