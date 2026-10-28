import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BrandLogo } from '@/components/BrandLogo';
import { SEO } from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Check, Loader2 } from 'lucide-react';
import { STYLE_OPTIONS, ORIGIN_OPTIONS, VOLUME_OPTIONS, joinCanonical } from '@/lib/importer-submission';

const EMPTY = { full_name: '', company_name: '', country: '', email: '', phone: '', sample_address: '', volume: '', price_range: '', requirements: '', website_confirmation: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SubmitOpportunity() {
  const { t, i18n } = useTranslation();
  const lang: 'fr' | 'en' = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const s = (k: string) => t(`submitOpportunity.${k}`) as string;
  const [f, setF] = useState(EMPTY);
  const [styles, setStyles] = useState<string[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);
  const [consentPublish, setConsentPublish] = useState(false);
  const [consentDirect, setConsentDirect] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const toggle = (list: string[], setList: (v: string[]) => void, v: string) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const validate = () => {
    const e: Record<string, string> = {};
    for (const k of ['full_name', 'company_name', 'country'] as const) if (!f[k].trim()) e[k] = s('required');
    if (!EMAIL_RE.test(f.email.trim())) e.email = s('invalidEmail');
    if (!styles.length) e.styles = s('chooseOne');
    if (!origins.length) e.origins = s('chooseOne');
    if (!consentPublish) e.consent = s('mustConsent');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (sending) return;
    setServerError('');
    if (!validate()) return;
    setSending(true);
    const trim = (v: string, max: number) => v.trim().slice(0, max) || undefined;
    const body = {
      full_name: f.full_name.trim().slice(0, 150), company_name: f.company_name.trim().slice(0, 200), country: f.country.trim().slice(0, 100),
      email: f.email.trim().toLowerCase().slice(0, 255), phone: trim(f.phone, 50), sample_address: trim(f.sample_address, 500),
      wine_styles: joinCanonical(STYLE_OPTIONS.filter(o => styles.includes(o.en)).map(o => o.en)),
      origins: joinCanonical(ORIGIN_OPTIONS.filter(o => origins.includes(o.en)).map(o => o.en)),
      volume: f.volume || undefined, price_range: trim(f.price_range, 200), requirements: trim(f.requirements, 3000),
      consent_publish: true, consent_direct_contact: consentDirect, locale: lang, website_confirmation: f.website_confirmation,
    };
    try {
      const { data, error } = await supabase.functions.invoke('submit-importer-opportunity', { body });
      if (error) {
        const status = (error as { context?: Response }).context?.status;
        setServerError(status === 429 ? s('errorRate') : s('errorGeneric'));
        return;
      }
      if (!data?.success) { setServerError(s('errorGeneric')); return; }
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch {
      setServerError(s('errorGeneric'));
    } finally {
      setSending(false);
    }
  };

  const reset = () => { setF(EMPTY); setStyles([]); setOrigins([]); setConsentPublish(false); setConsentDirect(false); setErrors({}); setDone(false); };

  const field = (k: keyof typeof EMPTY, label: string, opts: { optional?: boolean; type?: string; autoComplete?: string } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k} className="text-[15px] font-medium">{label}{opts.optional && <span className="ml-1 font-normal text-muted-foreground">({s('optional')})</span>}</Label>
      <Input id={k} type={opts.type ?? 'text'} autoComplete={opts.autoComplete} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} className="h-11 text-[15px]" />
      {errors[k] && <p className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  );

  const chips = (opts: readonly { en: string; fr: string }[], list: string[], setList: (v: string[]) => void, name: string) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {opts.map(o => {
        const on = list.includes(o.en);
        return (
          <button key={o.en} type="button" aria-pressed={on} onClick={() => toggle(list, setList, o.en)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[15px] transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/50'}`}>
            {on && <Check className="h-4 w-4" />}{o[lang]}
          </button>
        );
      })}
    </div>
  );

  const section = (title: string, children: React.ReactNode) => (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
      <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'Georgia, serif' }}>{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO title={s('seoTitle')} description={s('seoDescription')} path="/submit-opportunity" />
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center"><BrandLogo className="h-12 w-auto max-w-[240px]" /></Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 md:py-12">
        {done ? (
          <div className="rounded-xl border border-primary/20 bg-card p-8 text-center space-y-4" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Georgia, serif' }}>{s('successTitle')}</h1>
            <p className="text-[15px] text-muted-foreground">{s('successText')}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button variant="outline" onClick={reset}>{s('another')}</Button>
              <Button asChild><Link to="/">{s('back')}</Link></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{s('kicker')}</div>
              <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-foreground" style={{ fontFamily: 'Georgia, serif' }}>{s('title')}</h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{s('intro')}</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {(t('submitOpportunity.points', { returnObjects: true }) as string[]).map(p => (
                  <li key={p} className="flex items-center gap-2 text-[15px] text-foreground"><Check className="h-4 w-4 text-primary" />{p}</li>
                ))}
              </ul>
            </div>

            <form onSubmit={submit} noValidate className="space-y-5">
              {section(s('contact'), (
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('full_name', s('fullName'), { autoComplete: 'name' })}
                  {field('company_name', s('company'), { autoComplete: 'organization' })}
                  {field('country', s('country'), { autoComplete: 'country-name' })}
                  {field('email', s('email'), { type: 'email', autoComplete: 'email' })}
                  {field('phone', s('phone'), { optional: true, type: 'tel', autoComplete: 'tel' })}
                  {field('sample_address', s('sampleAddress'), { optional: true, autoComplete: 'street-address' })}
                </div>
              ))}

              {section(s('search'), (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="text-[15px] font-medium">{s('styles')}</div>
                    {chips(STYLE_OPTIONS, styles, setStyles, s('styles'))}
                    {errors.styles && <p className="text-sm text-destructive">{errors.styles}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="text-[15px] font-medium">{s('origins')}</div>
                    {chips(ORIGIN_OPTIONS, origins, setOrigins, s('origins'))}
                    <p className="text-sm text-muted-foreground">{s('originsHint')}</p>
                    {errors.origins && <p className="text-sm text-destructive">{errors.origins}</p>}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-medium">{s('volume')} <span className="font-normal text-muted-foreground">({s('optional')})</span></Label>
                      <Select value={f.volume} onValueChange={v => setF(p => ({ ...p, volume: v }))}>
                        <SelectTrigger className="h-11 text-[15px]" aria-label={s('volume')}><SelectValue placeholder={s('volumePlaceholder')} /></SelectTrigger>
                        <SelectContent>{VOLUME_OPTIONS.map(o => <SelectItem key={o.en} value={o.en} className="text-[15px]">{o[lang]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="price_range" className="text-[15px] font-medium">{s('price')} <span className="font-normal text-muted-foreground">({s('optional')})</span></Label>
                      <Input id="price_range" value={f.price_range} onChange={set('price_range')} placeholder={s('pricePlaceholder')} className="h-11 text-[15px]" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="requirements" className="text-[15px] font-medium">{s('requirements')} <span className="font-normal text-muted-foreground">({s('optional')})</span></Label>
                    <Textarea id="requirements" rows={4} maxLength={3000} value={f.requirements} onChange={set('requirements')} placeholder={s('requirementsPlaceholder')} className="text-[15px]" />
                  </div>
                </div>
              ))}

              {section(s('consents'), (
                <div className="space-y-4">
                  <label className="flex items-start gap-3 text-[15px] leading-relaxed cursor-pointer">
                    <Checkbox checked={consentPublish} onCheckedChange={v => setConsentPublish(v === true)} className="mt-1" aria-invalid={!!errors.consent} />
                    <span>{s('consentPublish')} <span className="text-destructive">*</span></span>
                  </label>
                  {errors.consent && <p className="text-sm text-destructive">{errors.consent}</p>}
                  <label className="flex items-start gap-3 text-[15px] leading-relaxed cursor-pointer">
                    <Checkbox checked={consentDirect} onCheckedChange={v => setConsentDirect(v === true)} className="mt-1" />
                    <span>{s('consentDirect')}</span>
                  </label>
                  <p className="rounded-md bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">{s('consentExplain')}</p>
                </div>
              ))}

              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label htmlFor="website_confirmation">Website</label>
                <input id="website_confirmation" name="website_confirmation" tabIndex={-1} autoComplete="off" value={f.website_confirmation} onChange={set('website_confirmation')} />
              </div>

              {serverError && <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[15px] text-destructive" role="alert">{serverError}</p>}
              <Button type="submit" size="lg" className="w-full text-base" disabled={sending}>
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{s('submitting')}</> : s('submit')}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
