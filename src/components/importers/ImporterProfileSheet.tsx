import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Mail, Phone, MapPin, X, Loader2, AlertCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { COUNTRIES } from '@/components/importers/country-data';
import { getCountryFlag } from '@/lib/country-flag';
import { importerProfileRepository, safeExternalUrl, cleanValues, descriptionFor, hasReliableDescription, importLabel, profileSources, additionalProfileEmails, type ImporterContact, type ImporterProfileRepository, type ImporterProfileResult } from '@/lib/importer-profile';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 border-t border-border pt-7"><h3 className="font-display text-xl text-primary">{title}</h3>{children}</section>;
}
function Values({ label, values }: { label: string; values?: string[] }) {
  const items = cleanValues(values);
  if (!items.length) return null;
  return <div><h4 className="mb-2 text-sm font-medium text-muted-foreground">{label}</h4><ul className="flex flex-wrap gap-x-5 gap-y-2">{items.map(v => <li key={v} className="text-base leading-7">{v}</li>)}</ul></div>;
}
function SourceLink({ url, label }: { url?: string | null; label: string }) {
  const safe = safeExternalUrl(url);
  if (!safe) return null;
  return <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"><ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="break-all">{label}</span></a>;
}

export function ImporterProfileSheet({ contact, onClose, repository = importerProfileRepository }: {
  contact: ImporterContact | null; onClose: () => void; repository?: ImporterProfileRepository;
}) {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<ImporterProfileResult | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contactId = contact?.id;
  useEffect(() => {
    setResult(null); setError(false); scrollRef.current?.scrollTo(0, 0);
    if (!contactId) return;
    const controller = new AbortController();
    repository.load(contactId, controller.signal).then(value => {
      if (!controller.signal.aborted) setResult(value);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [contactId, repository, retry]);
  const data = result?.status === 'ready' ? result.data : null;
  const enrichment = data?.enrichment ?? null;
  const description = descriptionFor(enrichment, i18n.language);
  const sources = data ? profileSources(data) : [];
  const country = COUNTRIES.find(c => [c.name, c.englishName, ...(c.dbAliases ?? [])].some(n => n.toLowerCase() === contact?.country.toLowerCase()));
  const countryLabel = country ? (i18n.language.startsWith('en') ? country.englishName : country.name) : contact?.country;
  const address = contact?.full_address || (contact?.street && contact.city && contact.postal_code ? `${contact.street}, ${contact.postal_code} ${contact.city}, ${countryLabel}` : contact?.city ? `${contact.city}, ${countryLabel}` : contact?.Address);
  const people = data?.people.filter(p => p.full_name?.trim()) ?? [];
  const emails = data ? additionalProfileEmails(data, contact?.email) : [];
  const confidenceLabel = (value: string) => t(`importerProfile.${({ high: 'confidenceHigh', medium: 'confidenceMedium', low: 'confidenceLow' } as Record<string, string>)[value] ?? 'confidenceUnknown'}`);
  const name = contact?.company_name || t('importerProfile.unnamed');
  const hasOrigins = enrichment && cleanValues([...(enrichment.wine_origins ?? []), ...(enrichment.wine_regions ?? []), ...(enrichment.wine_appellations ?? [])]).length > 0;
  const hasStyles = enrichment && cleanValues([...(enrichment.wine_styles ?? []), ...(enrichment.wine_specialties ?? [])]).length > 0;
  return <Dialog.Root open={Boolean(contact)} onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/20 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <Dialog.Content aria-describedby={undefined} className="importer-profile-panel fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col overflow-hidden border-l border-border bg-background shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right motion-reduce:animate-none">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3 sm:px-10"><span className="text-sm font-medium text-muted-foreground">{t('importerProfile.title')}</span><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label={t('importerProfile.close')} title={t('importerProfile.close')}><X /></Button></Dialog.Close></div>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-14 pt-8 sm:px-10 sm:pt-10">
          <header className="mb-9 space-y-6">
            <div className="space-y-3"><p className="flex items-center gap-2 text-sm text-muted-foreground"><span aria-hidden="true">{getCountryFlag(contact?.country)}</span>{countryLabel}</p><Dialog.Title className="break-words font-display text-3xl leading-tight text-primary sm:text-4xl">{name}</Dialog.Title>{hasReliableDescription(enrichment) && <Badge variant="secondary" className="font-normal">{t('importerProfile.enriched')}</Badge>}</div>
            <dl className="space-y-3 text-base leading-7">
              {contact?.email && <div className="flex items-start gap-3"><dt className="pt-1 text-muted-foreground"><Mail className="h-4 w-4" /><span className="sr-only">{t('importerProfile.email')}</span></dt><dd className="min-w-0 break-all"><a className="text-primary hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>}
              {contact?.phone && <div className="flex items-start gap-3"><dt className="pt-1 text-muted-foreground"><Phone className="h-4 w-4" /><span className="sr-only">{t('importerProfile.phone')}</span></dt><dd><a className="hover:underline" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{contact.phone}</a></dd></div>}
              {address && <div className="flex items-start gap-3"><dt className="pt-1 text-muted-foreground"><MapPin className="h-4 w-4" /><span className="sr-only">{t('importerProfile.address')}</span></dt><dd className="min-w-0 break-words">{address}</dd></div>}
              {safeExternalUrl(contact?.website_url) && <div className="flex items-start gap-3"><dt className="pt-1 text-muted-foreground"><Globe className="h-4 w-4" /><span className="sr-only">{t('importerProfile.website')}</span></dt><dd className="min-w-0"><SourceLink url={contact?.website_url} label={contact?.website_url?.replace(/^https?:\/\/(www\.)?/, '') ?? ''} /></dd></div>}
              {[['Facebook', contact?.Facebook], ['Instagram', contact?.Instagram], ['LinkedIn', contact?.LinkedIn]].filter(([, url]) => safeExternalUrl(url)).map(([label, url]) => <div key={label}><SourceLink url={url} label={label ?? ''} /></div>)}
            </dl>
          </header>
          <div aria-live="polite">
            {!result && !error && <div className="space-y-8"><div role="status" className="flex items-center gap-3 border-t border-border py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('importerProfile.loading')}</div><Section title={t('importerProfile.contacts')}><p role="status" className="text-sm text-muted-foreground">{t('importerProfile.peopleLoading')}</p></Section></div>}
            {error && <div role="alert" className="space-y-3 border-t border-border py-8"><p className="flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 shrink-0" />{t('importerProfile.error')}</p><Button variant="outline" onClick={() => setRetry(v => v + 1)}>{t('importerProfile.retry')}</Button></div>}
            {result?.status === 'not-connected' && <p className="border-t border-border py-7 text-sm leading-6 text-muted-foreground">{t('importerProfile.notConnected')}</p>}
            {result?.status === 'restricted' && <p className="border-t border-border py-7 text-sm leading-6 text-muted-foreground">{t('importerProfile.restricted')}</p>}
          </div>
          {data && <div className="space-y-8">
            {description.text && <Section title={t('importerProfile.about')}>
              {description.language !== (i18n.language.startsWith('en') ? 'en' : 'fr') && <p className="text-xs text-muted-foreground">{t('importerProfile.originalLanguage', { language: t(`importerProfile.${description.language === 'en' ? 'english' : 'french'}`) })}</p>}
              <div lang={description.language} className="space-y-5 text-base leading-8">{description.text.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap break-words">{paragraph}</p>)}</div>
            </Section>}
            {hasOrigins && <Section title={t('importerProfile.origins')}><Values label={t('importerProfile.countries')} values={enrichment?.wine_origins} /><Values label={t('importerProfile.regions')} values={enrichment?.wine_regions} /><Values label={t('importerProfile.appellations')} values={enrichment?.wine_appellations} /></Section>}
            {hasStyles && <Section title={t('importerProfile.styles')}><Values label={t('importerProfile.wineStyles')} values={enrichment?.wine_styles} /><Values label={t('importerProfile.specialties')} values={enrichment?.wine_specialties} /></Section>}
            {cleanValues(enrichment?.featured_producers).length > 0 && <Section title={t('importerProfile.producers')}><ul className="space-y-2 text-base leading-7">{cleanValues(enrichment?.featured_producers).map(v => <li key={v}>{v}</li>)}</ul></Section>}
            {cleanValues(enrichment?.distribution_channels).length > 0 && <Section title={t('importerProfile.channels')}><ul className="space-y-2 text-base leading-7">{cleanValues(enrichment?.distribution_channels).map(v => <li key={v}>{v}</li>)}</ul></Section>}
            {enrichment?.direct_import_status && <Section title={t('importerProfile.importing')}><p className="text-base leading-7">{t(`importerProfile.${importLabel(enrichment, data.evidence)}`)}</p></Section>}
            <Section title={t('importerProfile.contacts')}>{people.length > 0 ? <ul className="divide-y divide-border">{people.map(p => <li key={p.id} className="space-y-2 py-4 first:pt-0"><p className="break-words text-base font-medium">{p.full_name}</p>{p.job_title && <p className="break-words text-sm text-muted-foreground">{p.job_title}</p>}{p.business_email && <a href={`mailto:${p.business_email}`} className="block break-all text-primary hover:underline">{p.business_email}</a>}{p.business_phone && <a href={`tel:${p.business_phone.replace(/[^+\d]/g, '')}`} className="block break-words hover:underline">{p.business_phone}</a>}<div className="flex flex-wrap gap-x-5 gap-y-2"><SourceLink url={p.linkedin_url} label="LinkedIn" /><SourceLink url={p.source_url} label={t('importerProfile.source')} /></div><p className="text-xs text-muted-foreground">{t('importerProfile.confidence')} : {confidenceLabel(p.confidence)}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">{t('importerProfile.peopleEmpty')}</p>}</Section>
            {enrichment?.commercial_notes?.trim() && <Section title={t('importerProfile.commercialNotes')}><p className="whitespace-pre-wrap break-words text-base leading-8">{enrichment.commercial_notes}</p></Section>}
            <Section title={t('importerProfile.emails')}>{emails.length > 0 ? <ul className="space-y-5">{emails.map(e => <li key={e.id} className="space-y-1"><a href={`mailto:${e.email}`} className="block break-all text-primary hover:underline">{e.email}</a>{e.email_purpose && <p className="break-words text-sm text-muted-foreground">{e.email_purpose}</p>}<SourceLink url={e.source_url} label={t('importerProfile.source')} /><p className="text-xs text-muted-foreground">{t('importerProfile.confidence')} : {confidenceLabel(e.confidence)}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">{t('importerProfile.emailsEmpty')}</p>}</Section>
            {sources.length > 0 && <Section title={t('importerProfile.sources')}><ul className="space-y-3">{sources.map(url => <li key={url}><SourceLink url={url} label={url.replace(/^https?:\/\//, '')} /></li>)}</ul></Section>}
          </div>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}