import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, Loader2, RefreshCw, Save, Sparkles, Trash2, Type, Heading1, Lock, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RichTextBlock } from './RichTextBlock';
import { EmailPreviewFrame } from './EmailPreviewFrame';
import { MediaPickerDialog } from './MediaPickerDialog';
import { functionErrorMessage } from '@/lib/media-upload';
import { clearSnapshotIf, createAutosaver, readSnapshot, removeSnapshot, shouldOfferRecovery, writeSnapshot, type DraftSnapshot, type SaveStatus } from '@/lib/email-autosave';
import {
  contentFromDraft, draftFromContent, draftKey, draftProblems, emptyDraft, hasAdjacentImages, imageCount,
  insertBlock, MAX_CTA, MAX_IMAGES, moveBlock, newId, removeBlock, SUBJECT_PREFIX, type DraftBlock, type EmailDraft,
} from '@/lib/email-draft';

import { canGenerateCampaignEmail, generationState } from '../../../../supabase/functions/_shared/campaign-generation-policy';

export interface EmailStepState { dirty: boolean; hasSavedEmail: boolean }

interface Props {
  campaignId: string;
  initialContent: unknown;
  initialHtml: string | null;
  generationCount: number;
  generatedAt?: string | null;
  sender?: string;
  userId?: string;
  /** campaigns.updated_at of the loaded row, used to decide whether a local copy is newer. */
  serverUpdatedAt?: string | null;
  /** Called after each server-confirmed save so the parent never keeps a stale copy. */
  onSaved?: (content: unknown, html: string) => void;
  /** Lets the parent save pending edits (global "Save draft" button). */
  registerFlush?: (fn: (() => Promise<boolean>) | null) => void;
  onStateChange: (s: EmailStepState) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const EmailPrepareStep = ({ campaignId, initialContent, initialHtml, generationCount, generatedAt, sender, userId, serverUpdatedAt, onSaved, registerFlush, onStateChange, onBack, onContinue }: Props) => {
  const { t } = useTranslation();
  const initial = useMemo(() => draftFromContent(initialContent), [initialContent]);
  const [draft, setDraft] = useState<EmailDraft>(initial ?? emptyDraft());
  const [savedKey, setSavedKey] = useState<string | null>(initial ? draftKey(initial) : null);
  const [savedDraft, setSavedDraft] = useState<EmailDraft | null>(initial);
  const [savedHtml, setSavedHtml] = useState<string | null>(initial && initialHtml ? initialHtml : null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(initial && initialHtml ? initialHtml : null);
  const [previewKey, setPreviewKey] = useState<string | null>(initial && initialHtml ? draftKey(initial) : null);
  const [generations, setGenerations] = useState(generationCount);
  const [genAt, setGenAt] = useState<string | null>(generatedAt ?? null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<null | 'generate' | 'save' | 'preview'>(null);
  const [isProposal, setIsProposal] = useState(false);
  const [pickerAt, setPickerAt] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [recovery, setRecovery] = useState<DraftSnapshot<EmailDraft> | null>(() => {
    if (!userId || typeof window === 'undefined') return null;
    const snap = readSnapshot<EmailDraft>(window.localStorage, userId, campaignId);
    return shouldOfferRecovery(snap, initial ? draftKey(initial) : null, serverUpdatedAt) && draftFromContent(contentFromDraft(snap!.draft)) ? snap : null;
  });

  // Serialized autosave (2 s after the last edit). The ref always calls the latest closure.
  const saveRef = useRef<(d: EmailDraft, k: string) => Promise<boolean>>(async () => false);
  const autosaver = useRef<ReturnType<typeof createAutosaver<EmailDraft>> | null>(null);
  if (!autosaver.current) {
    autosaver.current = createAutosaver<EmailDraft>({
      keyOf: draftKey,
      isValid: (d) => draftProblems(d).length === 0,
      save: (d, k) => saveRef.current(d, k),
      onStatus: setSaveStatus,
    });
    autosaver.current.markSaved(initial ? draftKey(initial) : null);
  }

  const key = draftKey(draft);
  const hasContent = draft.blocks.length > 0;
  const dirty = hasContent && key !== savedKey;
  const stale = !!previewHtml && key !== previewKey;
  const problems = draftProblems(draft);
  const genSt = { hasEmail: !!savedHtml || hasContent, generatedAt: genAt };
  const gState = generationState(generations, genSt);
  const canGenerate = canGenerateCampaignEmail(generations, genSt) && !hasContent;
  void tick;

  // A generation started elsewhere (page left): poll until its saved email appears or it is marked interrupted.
  useEffect(() => {
    if (gState !== 'in_progress' || busy) return;
    const iv = setInterval(async () => {
      const { data } = await supabase.from('campaigns').select('email_content,message_html,email_generation_count,email_generated_at').eq('id', campaignId).maybeSingle();
      if (!data) return;
      const d = draftFromContent(data.email_content);
      if (d && data.message_html) {
        setDraft(d); setSavedDraft(d); setSavedKey(draftKey(d)); setSavedHtml(data.message_html);
        setPreviewHtml(data.message_html); setPreviewKey(draftKey(d));
        autosaver.current!.markSaved(draftKey(d)); onSaved?.(data.email_content, data.message_html);
      }
      setGenerations(data.email_generation_count ?? 0); setGenAt(data.email_generated_at ?? null); setTick((x) => x + 1);
    }, 10_000);
    return () => clearInterval(iv);
  }, [gState, busy, campaignId]);

  useEffect(() => { onStateChange({ dirty, hasSavedEmail: !!savedHtml }); }, [dirty, savedHtml, onStateChange]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const fail = async (error: any, data: any) => {
    toast({ title: t('emailEditor.errors.title'), description: await functionErrorMessage(error, data), variant: 'destructive' });
  };

  saveRef.current = async (d: EmailDraft, k: string) => {
    const { data, error } = await supabase.functions.invoke('save-campaign-email', { body: { campaignId, mode: 'save', content: contentFromDraft(d) } });
    if (error || data?.error) { await fail(error, data); return false; }
    // Only the version that was sent is marked saved; the text being typed meanwhile is never replaced.
    setSavedKey(k); setSavedDraft(d); setSavedHtml(data.html);
    setPreviewHtml(data.html); setPreviewKey(k);
    if (userId) clearSnapshotIf(window.localStorage, userId, campaignId, k);
    onSaved?.(contentFromDraft(d), data.html);
    return true;
  };

  // Feed every edit (subject, blocks, CTA, images, order) to the autosaver; AI proposals wait for an explicit save.
  useEffect(() => {
    if (!hasContent || isProposal) return;
    autosaver.current!.edit(draft);
    if (userId && key !== savedKey) writeSnapshot(window.localStorage, userId, campaignId, draft, key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isProposal, hasContent]);

  const flush = useCallback(() => autosaver.current!.flush(), []);
  useEffect(() => { registerFlush?.(flush); return () => registerFlush?.(null); }, [registerFlush, flush]);
  // Leaving the tab saves right away; unmounting saves pending edits and keeps the local copy newest.
  const draftRef = useRef(draft); draftRef.current = draft;
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      const a = autosaver.current!;
      if (!a.isSaved()) {
        if (userId) writeSnapshot(window.localStorage, userId, campaignId, draftRef.current, draftKey(draftRef.current));
        void a.flush();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  const restoreLocal = () => { if (recovery) { setIsProposal(false); setDraft(recovery.draft); } setRecovery(null); };
  const discardLocal = () => { if (userId) removeSnapshot(window.localStorage, userId, campaignId); setRecovery(null); };
  const writeWithoutAi = () => setDraft({ ...emptyDraft(), blocks: [{ id: newId(), type: 'text', html: '' }] });

  const generate = async () => {
    if (busy || !canGenerate) return;
    setBusy('generate');
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-email', { body: { campaignId, apply: false } });
      if (error || data?.error) return await fail(error, data);
      const d = draftFromContent(data.content);
      if (!d) return await fail(null, { error: t('emailEditor.errors.generic') });
      setDraft(d);
      setPreviewHtml(data.html);
      setPreviewKey(draftKey(d));
      setIsProposal(!data.applied);
      if (data.applied) { setSavedDraft(d); setSavedKey(draftKey(d)); setSavedHtml(data.html); autosaver.current!.markSaved(draftKey(d)); onSaved?.(data.content, data.html); }
      setGenerations(1);
    } finally {
      const { data } = await supabase.from('campaigns').select('email_generation_count,email_generated_at').eq('id', campaignId).maybeSingle();
      if (data) { setGenerations(data.email_generation_count ?? 0); setGenAt(data.email_generated_at ?? null); }
      setBusy(null);
    }
  };

  const showProblems = () => {
    toast({ title: t('emailEditor.errors.title'), description: problems.map((p) => t(`emailEditor.problems.${p}`)).join(' '), variant: 'destructive' });
  };
  const saveNow = async () => {
    if (problems.length) { showProblems(); return false; }
    setBusy('save');
    try {
      autosaver.current!.edit(draft);
      const ok = await autosaver.current!.flush();
      if (ok) { setIsProposal(false); toast({ title: t('emailEditor.saved') }); }
      return ok;
    } finally { setBusy(null); }
  };

  const callSave = async (mode: 'preview') => {
    if (problems.length) { showProblems(); return false; }
    setBusy(mode);
    try {
      const sentKey = key;
      const { data, error } = await supabase.functions.invoke('save-campaign-email', { body: { campaignId, mode, content: contentFromDraft(draft) } });
      if (error || data?.error) { await fail(error, data); return false; }
      setPreviewHtml(data.html);
      setPreviewKey(sentKey);
      return true;
    } finally { setBusy(null); }
  };

  const discardProposal = () => {
    setIsProposal(false);
    setDraft(savedDraft ?? emptyDraft());
    setPreviewHtml(savedHtml);
    setPreviewKey(savedDraft && savedHtml ? draftKey(savedDraft) : null);
  };

  const update = (blocks: DraftBlock[]) => setDraft((d) => ({ ...d, blocks }));
  const setBlock = (id: string, patch: Partial<DraftBlock>) =>
    setDraft((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as DraftBlock) : b)) }));
  const addText = (type: 'text' | 'heading', after?: number) => update(insertBlock(draft.blocks, { id: newId(), type, html: '' }, after));
  const openPicker = (after?: number) => {
    if (imageCount(draft.blocks) >= MAX_IMAGES) { toast({ title: t('emailEditor.tooManyImages'), variant: 'destructive' }); return; }
    setPickerAt(after ?? draft.blocks.length - 1);
  };

  const continueNext = async () => {
    setBusy('save');
    const ok = isProposal ? false : await autosaver.current!.flush().finally(() => setBusy(null));
    if (isProposal) setBusy(null);
    if (!ok || !autosaver.current!.isSaved() || !(savedHtml || ok && hasContent)) { toast({ title: t('emailEditor.mustSave'), variant: 'destructive' }); return; }
    onContinue();
  };
  const goBack = async () => {
    if (isProposal) { if (!window.confirm(t('emailEditor.leaveConfirm'))) return; onBack(); return; }
    const ok = await autosaver.current!.flush();
    if (!ok && !window.confirm(t('emailEditor.flushFailed'))) return;
    onBack();
  };
  const statusLabel = isProposal ? t('emailEditor.unsaved')
    : saveStatus === 'saving' ? t('emailEditor.autoSaving')
    : saveStatus === 'error' ? t('emailEditor.autoFailed')
    : saveStatus === 'invalid' ? t('emailEditor.autoIncomplete')
    : dirty ? t('emailEditor.unsaved')
    : t('emailEditor.autoSaved');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{t('emailEditor.title')}</CardTitle>
          <CardDescription>{t('emailEditor.intro')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-muted/50 border-primary/20">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertDescription>{t('emailEditor.reviewNotice')}</AlertDescription>
          </Alert>
          {canGenerate && <div className="flex justify-center">
          <Button onClick={generate} disabled={!!busy}>
            {busy === 'generate' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {busy === 'generate' ? t('emailEditor.generating') : t('emailEditor.generate')}
          </Button>
          </div>}
          {!hasContent && !savedHtml && gState !== 'in_progress' && busy !== 'generate' && <div className="text-center">
            <Button type="button" variant="link" size="sm" onClick={writeWithoutAi} title={t('emailEditor.writeWithoutAiHelp')}>{t('emailEditor.writeWithoutAi')}</Button>
          </div>}
          {recovery && <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{t('emailEditor.recoveryTitle')}</span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" onClick={restoreLocal}>{t('emailEditor.recoveryRestore')}</Button>
                <Button size="sm" variant="ghost" onClick={discardLocal}>{t('emailEditor.recoveryDiscard')}</Button>
              </span>
            </AlertDescription>
          </Alert>}
          {hasContent && <div className="flex flex-wrap justify-end items-center gap-2">
            <span role="status" aria-live="polite" className={saveStatus === 'error' || saveStatus === 'invalid' || isProposal ? 'text-xs font-medium text-destructive flex items-center gap-1' : 'text-xs text-muted-foreground flex items-center gap-1'}>
              {saveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}{statusLabel}
            </span>
            <Button onClick={saveNow} disabled={!!busy || !dirty || saveStatus === 'saving'}>
              {busy === 'save' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {busy === 'save' ? t('emailEditor.saving') : t('emailEditor.save')}
            </Button>
          </div>}
        </CardContent>
      </Card>

      {isProposal && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{t('emailEditor.proposalBanner')}</span>
            {savedDraft && <Button size="sm" variant="ghost" onClick={discardProposal}>{t('emailEditor.discardProposal')}</Button>}
          </AlertDescription>
        </Alert>
      )}

      {!hasContent ? (
        <Card><CardContent className="py-12 text-center space-y-2">
          <p className="font-medium">{t('emailEditor.emptyTitle')}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{t(gState === 'in_progress' ? 'emailEditor.generationInProgress' : gState === 'interrupted' ? 'emailEditor.generationInterrupted' : canGenerate ? 'emailEditor.emptyBody' : 'emailEditor.generationUsed')}</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Editor */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email-subject">{t('emailEditor.subject')}</Label>
                <div className="flex items-stretch rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                  <span className="flex items-center gap-1 px-2 text-xs bg-muted text-muted-foreground rounded-l-md whitespace-nowrap" title={SUBJECT_PREFIX}><Lock className="h-3 w-3" />{t('emailEditor.subjectPrefix')}</span>
                  <input id="email-subject" className="flex-1 min-w-0 bg-background px-3 py-2 text-sm rounded-r-md focus:outline-none" value={draft.subject} maxLength={200} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
                </div>
                <p className="text-xs text-muted-foreground">{t('emailEditor.subjectHelp')}</p>
              </div>

              <div className="space-y-3">
                <Label>{t('emailEditor.blocks')}</Label>
                {draft.blocks.map((b, i) => (
                  <div key={b.id} className="rounded-lg border p-3 space-y-2 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {b.type === 'image' ? t('emailEditor.image') : b.type === 'heading' ? t('emailEditor.heading') : t('emailEditor.paragraph')}
                      </span>
                      <div className="flex gap-0.5">
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} aria-label={t('emailEditor.moveUp')} title={t('emailEditor.moveUp')} onClick={() => update(moveBlock(draft.blocks, i, -1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === draft.blocks.length - 1} aria-label={t('emailEditor.moveDown')} title={t('emailEditor.moveDown')} onClick={() => update(moveBlock(draft.blocks, i, 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={t('emailEditor.remove')} title={t('emailEditor.remove')} onClick={() => update(removeBlock(draft.blocks, b.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {b.type === 'image' ? (
                      <div className="space-y-2">
                        <img src={b.url} alt={b.alt} className="w-full max-h-56 object-cover rounded-md" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }} />
                        <Input value={b.alt} maxLength={200} placeholder={t('emailEditor.alt')} aria-label={t('emailEditor.alt')} onChange={(e) => setBlock(b.id, { alt: e.target.value })} />
                      </div>
                    ) : (
                      <RichTextBlock html={b.html} variant={b.type} onChange={(html) => setBlock(b.id, { html })} />
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => addText('text')}><Type className="h-3.5 w-3.5 mr-1" />{t('emailEditor.addParagraph')}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addText('heading')}><Heading1 className="h-3.5 w-3.5 mr-1" />{t('emailEditor.addHeading')}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => openPicker()}><ImagePlus className="h-3.5 w-3.5 mr-1" />{t('emailEditor.addImage')}</Button>
                </div>
                {hasAdjacentImages(draft.blocks) && <p className="text-xs text-muted-foreground">{t('emailEditor.adjacentImages')}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-cta">{t('emailEditor.cta')}</Label>
                <Input id="email-cta" value={draft.cta_label} maxLength={MAX_CTA} onChange={(e) => setDraft((d) => ({ ...d, cta_label: e.target.value }))} />
                <p className="text-xs text-muted-foreground">{t('emailEditor.ctaHelp')}</p>
              </div>

              <p className="text-xs text-muted-foreground flex gap-1.5"><Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />{t('emailEditor.fixedParts')}</p>
              {problems.length > 0 && <p className="text-xs text-destructive">{problems.map((p) => t(`emailEditor.problems.${p}`)).join(' ')}</p>}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:sticky lg:top-4 self-start">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t('emailEditor.preview')}</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={() => callSave('preview')} disabled={!!busy || (!stale && !!previewHtml)}>
                {busy === 'preview' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                {t('emailEditor.refreshPreview')}
              </Button>
            </CardHeader>
            <CardContent>
              <EmailPreviewFrame html={previewHtml} subject={contentFromDraft(draft).subject} sender={sender} stale={stale} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={goBack}><ArrowLeft className="h-4 w-4 mr-2" />{t('emailEditor.back')}</Button>
        <Button onClick={continueNext} className="flex-1" disabled={!!busy}>{t('emailEditor.continue')}<ArrowRight className="h-4 w-4 ml-2" /></Button>
      </div>

      <MediaPickerDialog
        open={pickerAt !== null}
        onOpenChange={(o) => !o && setPickerAt(null)}
        onPick={(img) => update(insertBlock(draft.blocks, { id: newId(), type: 'image', url: img.url, alt: '', media_id: img.id }, pickerAt ?? undefined))}
      />

    </div>
  );
};
