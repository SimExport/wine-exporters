// React-free helpers for the campaign email editor: serialized autosave and a per-user/per-campaign local safety net.

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'invalid';

export interface AutosaverOptions<D> {
  keyOf: (d: D) => string;
  isValid: (d: D) => boolean;
  /** Persists one version; resolves true only once the server confirmed it. */
  save: (d: D, key: string) => Promise<boolean>;
  onStatus: (s: SaveStatus) => void;
  delayMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
}

/**
 * One save at a time, debounced after the last edit. A response only marks the exact version it carried as saved,
 * so an older response can never confirm newer edits; newer edits made during a request are saved right after it.
 */
export function createAutosaver<D>(o: AutosaverOptions<D>) {
  const delay = o.delayMs ?? 2000;
  const setT = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clrT = o.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let latest: D | null = null;
  let latestKey: string | null = null;
  let savedKey: string | null = null;
  let timer: unknown = null;
  let chain: Promise<boolean> = Promise.resolve(true);
  let status: SaveStatus = 'idle';
  const emit = (s: SaveStatus) => { if (s !== status) { status = s; o.onStatus(s); } };
  const stopTimer = () => { if (timer !== null) { clrT(timer); timer = null; } };

  const step = async (): Promise<boolean> => {
    for (;;) {
      if (latest === null || latestKey === savedKey) { if (latest !== null) emit('saved'); return true; }
      if (!o.isValid(latest)) { emit('invalid'); return false; }
      const sent = latest; const k = latestKey as string;
      emit('saving');
      let ok = false;
      try { ok = await o.save(sent, k); } catch { ok = false; }
      if (!ok) { emit(latestKey === savedKey ? 'saved' : 'error'); return latestKey === savedKey; }
      savedKey = k;
      // Still typing: let the debounce timer pick up the newer version instead of saving on every keystroke.
      if (timer !== null && latestKey !== savedKey) { emit('pending'); return false; }
    }
  };
  const run = () => (chain = chain.then(step, step));

  return {
    edit(d: D) {
      latest = d; latestKey = o.keyOf(d);
      stopTimer();
      if (latestKey === savedKey) { emit('saved'); return; }
      if (!o.isValid(d)) { emit('invalid'); return; }
      if (status !== 'saving') emit('pending');
      timer = setT(() => { timer = null; void run(); }, delay);
    },
    /** Saves pending edits now; resolves true when the latest version is confirmed by the server. */
    flush(): Promise<boolean> { stopTimer(); return run(); },
    /** A version persisted elsewhere (AI generation applied, initial load). */
    markSaved(key: string | null) { savedKey = key; if (latestKey !== null && latestKey === key) emit('saved'); },
    isSaved: () => latestKey === null || latestKey === savedKey,
    cancel: stopTimer,
    get status() { return status; },
  };
}

export interface DraftSnapshot<D> { draft: D; key: string; at: number }
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export const snapshotKey = (userId: string, campaignId: string) => `we:campaign-email-draft:${userId}:${campaignId}`;

export function writeSnapshot<D>(s: KV, userId: string, campaignId: string, draft: D, key: string, at = Date.now()) {
  try { s.setItem(snapshotKey(userId, campaignId), JSON.stringify({ draft, key, at })); } catch { /* quota/private mode */ }
}
export function readSnapshot<D>(s: KV, userId: string, campaignId: string): DraftSnapshot<D> | null {
  try {
    const raw = s.getItem(snapshotKey(userId, campaignId));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.key === 'string' && typeof v.at === 'number' && v.draft ? v : null;
  } catch { return null; }
}
/** Removes the snapshot only if it holds exactly the version the server just confirmed. */
export function clearSnapshotIf(s: KV, userId: string, campaignId: string, key: string) {
  const snap = readSnapshot(s, userId, campaignId);
  if (snap && snap.key === key) { try { s.removeItem(snapshotKey(userId, campaignId)); } catch { /* ignore */ } }
}
export function removeSnapshot(s: KV, userId: string, campaignId: string) {
  try { s.removeItem(snapshotKey(userId, campaignId)); } catch { /* ignore */ }
}
/** Offer recovery only when the local copy differs and is newer than the last server write. */
export function shouldOfferRecovery<D>(snap: DraftSnapshot<D> | null, serverKey: string | null, serverUpdatedAt: string | null | undefined): boolean {
  if (!snap || snap.key === serverKey) return false;
  const serverAt = serverUpdatedAt ? Date.parse(serverUpdatedAt) : NaN;
  return Number.isNaN(serverAt) ? !serverKey : snap.at > serverAt;
}
