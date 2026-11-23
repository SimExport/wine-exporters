import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildImporterNeeds } from '@/lib/importer-request-needs';

type Props = { sourceRef?: string | null; snippet?: string | null };

export default function ImporterRequestNeeds({ sourceRef, snippet }: Props) {
  const { t, i18n } = useTranslation();
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(!sourceRef);

  useEffect(() => {
    let cancelled = false;
    if (!sourceRef) { setLoaded(true); return; }
    setLoaded(false);
    supabase.from('importer_requests').select('*').eq('id', sourceRef).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('importer request read failed');
        setRequest((data as Record<string, unknown> | null) ?? null);
        setLoaded(true);
      }, () => { if (!cancelled) { setRequest(null); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [sourceRef]);

  if (!loaded) return null;
  const needs = buildImporterNeeds(request, snippet, i18n.language);
  if (!needs) return null;
  const label = 'text-xs font-medium uppercase tracking-wide text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('prospectDetail.importerNeeds.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {needs.requirements && (
          <div>
            <p className={label}>{t('prospectDetail.importerNeeds.requirements')}</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{needs.requirements}</p>
          </div>
        )}
        {needs.styles.length > 0 && (
          <div>
            <p className={label}>{t('prospectDetail.importerNeeds.styles')}</p>
            <div className="flex flex-wrap gap-2 mt-1">{needs.styles.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
          </div>
        )}
        {needs.origins.length > 0 && (
          <div>
            <p className={label}>{t('prospectDetail.importerNeeds.origins')}</p>
            <div className="flex flex-wrap gap-2 mt-1">{needs.origins.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
          </div>
        )}
        {needs.volume && (
          <div>
            <p className={label}>{t('prospectDetail.importerNeeds.volume')}</p>
            <p className="text-sm mt-1">{needs.volume}</p>
          </div>
        )}
        {needs.fallbackSnippet && <p className="text-sm whitespace-pre-wrap">{needs.fallbackSnippet}</p>}
      </CardContent>
    </Card>
  );
}
