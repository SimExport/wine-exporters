import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, MousePointer } from 'lucide-react';

interface Props {
  campaign: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

interface Respondent {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  country: string | null;
  score: number | null;
  description: string | null;
}

interface ClickerLead {
  id: string;
  email: string | null;
  market: string | null;
  source_score: number | null;
  owner_notes: string | null;
  created_at: string;
}

export function CampaignQualifiedProspectsSheet({ campaign, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [clickers, setClickers] = useState<ClickerLead[]>([]);

  useEffect(() => {
    if (!campaign) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase
          .from('campaign_interested_contacts')
          .select('id, company_name, contact_name, email, country, score, description')
          .eq('campaign_id', campaign.id)
          .eq('origin', 'form')
          .order('score', { ascending: false, nullsFirst: false }),
        supabase
          .from('campaign_interested_contacts')
          .select('id, email, country, score, description, created_at')
          .eq('campaign_id', campaign.id)
          .eq('origin', 'click')
          .order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setRespondents((r as Respondent[]) ?? []);
      setClickers(
        ((c as any[]) ?? []).map((row) => ({
          id: row.id,
          email: row.email ?? null,
          market: row.country ?? null,
          source_score: row.score ?? null,
          owner_notes: row.description ?? null,
          created_at: row.created_at,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [campaign]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US');

  return (
    <Sheet open={!!campaign} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('adminCampaigns.qualified.title')}</SheetTitle>
          <SheetDescription>
            {campaign?.name}
            {!loading && (
              <span className="ml-2 text-xs">
                · {t('adminCampaigns.qualified.respondentsCount', { count: respondents.length })} ·{' '}
                {t('adminCampaigns.qualified.clickersCount', { count: clickers.length })}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">
                  {t('adminCampaigns.qualified.respondents')} ({respondents.length})
                </h3>
              </div>
              {respondents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('adminCampaigns.qualified.emptyRespondents')}
                </p>
              ) : (
                <div className="space-y-2">
                  {respondents.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {r.company_name || r.contact_name || '—'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {r.contact_name && r.company_name ? `${r.contact_name} · ` : ''}
                            {r.email || '—'}
                            {r.country ? ` · ${r.country}` : ''}
                          </div>
                        </div>
                        {r.score != null && (
                          <Badge variant="secondary" className="shrink-0">
                            {r.score}/10
                          </Badge>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {r.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <MousePointer className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">
                  {t('adminCampaigns.qualified.clickers')} ({clickers.length})
                </h3>
              </div>
              {clickers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('adminCampaigns.qualified.emptyClickers')}
                </p>
              ) : (
                <div className="space-y-2">
                  {clickers.map((c) => (
                    <div key={c.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.email || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.market || '—'} · {fmtDate(c.created_at)}
                          </div>
                        </div>
                        {c.source_score != null && (
                          <Badge variant="secondary" className="shrink-0">
                            {c.source_score}/10
                          </Badge>
                        )}
                      </div>
                      {c.owner_notes && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {c.owner_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}