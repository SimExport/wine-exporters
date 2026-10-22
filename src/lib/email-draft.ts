// Editable campaign email model (v2). React-free so it can be unit tested.
// The browser only edits this structure; the final HTML is always rendered by
// the `save-campaign-email` Edge Function.

export const SUBJECT_PREFIX = '{{ contact.COMPANY_NAME }}';
export const DEFAULT_CTA = 'Send me the price list';
export const MAX_IMAGES = 3;
export const MAX_CTA = 60;

export type DraftBlock =
  | { id: string; type: 'heading' | 'text'; html: string }
  | { id: string; type: 'image'; url: string; alt: string; media_id?: string };

export interface EmailDraft {
  subject: string; // without the protected prefix
  cta_label: string;
  blocks: DraftBlock[];
}

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `b_${Date.now()}_${Math.random().toString(36).slice(2)}`);

export const emptyDraft = (): EmailDraft => ({ subject: '', cta_label: DEFAULT_CTA, blocks: [] });

export function stripSubjectPrefix(subject: string): string {
  const s = String(subject ?? '').trim();
  return s.startsWith(SUBJECT_PREFIX) ? s.slice(SUBJECT_PREFIX.length).trim() : s;
}

/** Reads a stored `email_content` (v2) into an editable draft. Unknown formats → null. */
export function draftFromContent(content: unknown): EmailDraft | null {
  const c = content as any;
  if (!c || c.version !== 2 || !Array.isArray(c.blocks)) return null;
  const blocks: DraftBlock[] = [];
  for (const b of c.blocks) {
    if (b?.type === 'image' && typeof b.url === 'string') {
      blocks.push({ id: String(b.id ?? newId()), type: 'image', url: b.url, alt: String(b.alt ?? ''), media_id: b.media_id ?? undefined });
    } else if (b?.type === 'heading' || b?.type === 'text') {
      blocks.push({ id: String(b.id ?? newId()), type: b.type, html: String(b.html ?? '') });
    }
  }
  return { subject: stripSubjectPrefix(c.subject ?? ''), cta_label: String(c.cta_label ?? DEFAULT_CTA), blocks };
}

export function contentFromDraft(d: EmailDraft) {
  return { version: 2 as const, subject: `${SUBJECT_PREFIX} ${d.subject.trim()}`.trim(), cta_label: d.cta_label.trim(), blocks: d.blocks };
}

export function moveBlock(blocks: DraftBlock[], index: number, delta: -1 | 1): DraftBlock[] {
  const to = index + delta;
  if (index < 0 || index >= blocks.length || to < 0 || to >= blocks.length) return blocks;
  const next = blocks.slice();
  const [b] = next.splice(index, 1);
  next.splice(to, 0, b);
  return next;
}

export function removeBlock(blocks: DraftBlock[], id: string): DraftBlock[] {
  return blocks.filter((b) => b.id !== id);
}

export function insertBlock(blocks: DraftBlock[], block: DraftBlock, afterIndex?: number): DraftBlock[] {
  const at = afterIndex === undefined ? blocks.length : Math.min(Math.max(afterIndex + 1, 0), blocks.length);
  const next = blocks.slice();
  next.splice(at, 0, block);
  return next;
}

export const imageCount = (blocks: DraftBlock[]) => blocks.filter((b) => b.type === 'image').length;

const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

/** Client-side checks mirroring the server, used to give immediate feedback. */
export function draftProblems(d: EmailDraft): string[] {
  const p: string[] = [];
  if (!d.subject.trim()) p.push('subject');
  if (d.cta_label.trim().length > MAX_CTA) p.push('cta');
  if (!d.blocks.some((b) => b.type !== 'image' && plain(b.html))) p.push('text');
  if (imageCount(d.blocks) > MAX_IMAGES) p.push('images');
  return p;
}

/** Two images with no text in between hurt deliverability. */
export function hasAdjacentImages(blocks: DraftBlock[]): boolean {
  return blocks.some((b, i) => b.type === 'image' && blocks[i + 1]?.type === 'image');
}

export const draftKey = (d: EmailDraft) => JSON.stringify(contentFromDraft(d));
