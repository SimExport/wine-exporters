import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, BookOpen, Building2, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import PublicLayout from '@/components/resources/PublicLayout';
import { DIRECTORY_COUNTRIES, directoryCountry, companyPath, type PublicDirectoryCompany } from '@/lib/directory-countries';
import { articlePath, DEMO_URL, fetchPublishedArticles, type SeoArticleSummary } from '@/lib/seo-articles';

const PublicDirectory = () => {
  const { country: countrySlug, slug } = useParams();
  const { t, i18n } = useTranslation();
  const [companies, setCompanies] = useState<PublicDirectoryCompany[]>([]);
  const [articles, setArticles] = useState<SeoArticleSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const country = countrySlug ? directoryCountry(countrySlug) : undefined;
  const name = country ? (i18n.language.startsWith('en') ? country.en : country.fr) : '';
  const company = slug && country ? companies.find(row => row.countryCode === country.code && row.slug === slug) : undefined;
  const missing = Boolean((countrySlug && !country) || (slug && loaded && !company));
  const countryCompanies = country ? companies.filter(row => row.countryCode === country.code) : companies;
  const relatedArticles = articles.filter(article => DIRECTORY_COUNTRIES.some(row => (!country || row.code === country.code) && row.articleSlug === article.slug));
  const path = countrySlug ? `/annuaire/${countrySlug}${slug ? `/${slug}` : ''}` : '/annuaire';
  const title = missing ? t('publicDirectory.notFound') : company?.name || (country ? t('publicDirectory.countryTitle', { country: name }) : t('publicDirectory.title'));
  const description = company?.description || (country ? t('publicDirectory.countryDescription', { country: name }) : t('publicDirectory.description'));

  useEffect(() => {
    const controller = new AbortController();
    fetch('/directory-public.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Public directory unavailable'); return response.json(); })
      .then(data => { if (!controller.signal.aborted && Array.isArray(data)) setCompanies(data); })
      .finally(() => { if (!controller.signal.aborted) setLoaded(true); })
      .catch(error => { if (!controller.signal.aborted) console.error('Public directory unavailable', error); });
    fetchPublishedArticles()
      .then(data => { if (!controller.signal.aborted) setArticles(data); })
      .catch(error => { if (!controller.signal.aborted) console.error('Public directory guides unavailable', error); });
    return () => controller.abort();
  }, []);

  return (
    <PublicLayout>
      {/* Published directory: valid country/company pages are indexable; unknown routes, and company pages until data has loaded, stay noindex. */}
      <SEO title={`${title} | WineExporters`} description={description} path={path} type="website" noindex={missing || Boolean(slug && !company)} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t('publicDirectory.home')}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/annuaire" className="hover:text-foreground">{t('publicDirectory.nav')}</Link>
          {country && <><ChevronRight className="h-3 w-3" /><Link to={`/annuaire/${country.slug}`} className="hover:text-foreground">{name}</Link></>}
          {company && <><ChevronRight className="h-3 w-3" /><span>{company.name}</span></>}
        </nav>
        <header className="max-w-3xl">
          {country && <span className="mb-3 block text-3xl" aria-hidden="true">{country.flag}</span>}
          <h1 className="break-words font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{missing ? t('publicDirectory.notFoundBody') : company?.description || t('publicDirectory.intro')}</p>
        </header>

        {!missing && !company && (
          <>
            {!country && <section className="mt-10">
              <h2 className="mb-4 font-display text-xl font-semibold">{t('publicDirectory.countries')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DIRECTORY_COUNTRIES.map(row => (
                  <Link key={row.code} to={`/annuaire/${row.slug}`} className="flex min-h-24 items-center gap-4 rounded-lg border bg-card p-5 transition-colors hover:bg-secondary">
                    <span className="text-3xl" aria-hidden="true">{row.flag}</span>
                    <div className="min-w-0 flex-1"><h3 className="font-semibold text-foreground">{i18n.language.startsWith('en') ? row.en : row.fr}</h3><p className="mt-1 text-sm text-muted-foreground">{t('publicDirectory.count', { count: companies.filter(company => company.countryCode === row.code).length })}</p></div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                  </Link>
                ))}
              </div>
            </section>}
            {countryCompanies.length === 0 ? (
              <section className="my-10 flex flex-col gap-4 border-y py-8 sm:flex-row sm:items-start">
                <Building2 className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
                <div><h2 className="font-display text-xl font-semibold">{t('publicDirectory.emptyTitle')}</h2><p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{t(country ? 'publicDirectory.emptyCountry' : 'publicDirectory.emptyBody')}</p></div>
              </section>
            ) : <section className="mt-8 divide-y border-y">{countryCompanies.map(row => {
              const rowCountry = DIRECTORY_COUNTRIES.find(item => item.code === row.countryCode);
              if (!rowCountry) return null;
              return <Link key={`${row.countryCode}/${row.slug}`} to={companyPath(rowCountry, row)} className="block py-5"><h2 className="text-lg font-semibold text-primary">{row.name}</h2><p className="mt-2 text-muted-foreground">{row.description}</p></Link>;
            })}</section>}
          </>
        )}

        {company && <section className="mt-8 border-y py-6">
          <Button asChild variant="outline"><a href={company.website} target="_blank" rel="noopener noreferrer">{t('publicDirectory.website')}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
          <h2 className="mt-8 text-lg font-semibold">{t('publicDirectory.sources')}</h2>
          <ul className="mt-3 space-y-2">{company.sources.map(source => <li key={source}><a href={source} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-primary underline">{source}</a></li>)}</ul>
        </section>}

        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><BookOpen className="h-5 w-5 text-primary" />{t('publicDirectory.resources')}</h2>
          {relatedArticles.length > 0 && <ul className="mt-4 space-y-3">{relatedArticles.map(article => <li key={article.id}><Link to={articlePath(article.slug)} className="font-medium text-primary hover:underline">{article.title}<ArrowRight className="ml-2 inline h-4 w-4" /></Link></li>)}</ul>}
          <Link to="/ressources" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">{t('publicDirectory.resources')}<ArrowRight className="h-4 w-4" /></Link>
        </section>
        <section className="mt-12 border-t pt-8">
          <h2 className="font-display text-2xl font-semibold">{t('publicDirectory.ctaTitle')}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{t('publicDirectory.ctaBody')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild><Link to="/demande-demo">{t('publicDirectory.account')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><a href={DEMO_URL} target="_blank" rel="noopener noreferrer">{t('publicDirectory.demo')}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
          </div>
        </section>
        {(countrySlug || missing) && <Link to="/annuaire" className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" />{t('publicDirectory.back')}</Link>}
      </div>
    </PublicLayout>
  );
};
export default PublicDirectory;