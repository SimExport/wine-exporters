export type Batch = { id: string; operation_id: string; idempotency_key: string; emails: string[] };
export type Outcome = { state: 'accepted' | 'failed' | 'indeterminate'; resendId?: string; error?: string };
export const MAX_BCC = 49;

export function notificationResult<T extends { status: string; remaining: number; failed: number; indeterminate: number }>(operation: T | null) {
  return { success: Boolean(operation && operation.status === 'completed' && operation.remaining === 0 && operation.failed === 0 && operation.indeterminate === 0), operation };
}

export function pendingChunks(recipients: { email: string; state: string }[]): string[][] {
  const emails = [...new Set(recipients.filter(r => r.state === 'pending' || r.state === 'failed').map(r => r.email.trim().toLowerCase()))];
  return Array.from({ length: Math.ceil(emails.length / MAX_BCC) }, (_, i) => emails.slice(i * MAX_BCC, (i + 1) * MAX_BCC));
}

export function providerOutcome(status: number, body: unknown): Outcome {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  if (status >= 200 && status < 300 && typeof data.id === 'string' && data.id) return { state: 'accepted', resendId: data.id };
  // A server error, timeout or malformed success may hide an accepted email.
  const state = status >= 400 && status < 500 && status !== 408 && status !== 409 ? 'failed' : 'indeterminate';
  return { state, error: `Resend HTTP ${status}${typeof data.name === 'string' ? ` (${data.name.slice(0, 80)})` : ''}` };
}

export async function deliverBatches(deps: {
  claim: () => Promise<Batch | null>;
  send: (batch: Batch) => Promise<Outcome>;
  finish: (batch: Batch, outcome: Outcome) => Promise<void>;
  pause: () => Promise<void>;
}): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const batch = await deps.claim();
    if (!batch) return;
    let outcome: Outcome;
    try {
      if (batch.emails.length < 1 || batch.emails.length > MAX_BCC) throw new Error('Invalid batch size');
      outcome = await deps.send(batch);
    } catch {
      outcome = { state: 'indeterminate', error: 'Réponse réseau incertaine ; rapprochement Resend requis.' };
    }
    // If persistence fails, the pre-send indeterminate claim remains: never resend blindly.
    await deps.finish(batch, outcome);
    if (outcome.state !== 'accepted') return;
    await deps.pause();
  }
}