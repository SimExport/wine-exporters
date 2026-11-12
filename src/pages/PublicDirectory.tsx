import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, BookOpen, Building2, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import PublicLayout from '@/components/resources/PublicLayout';
import { ArticleContent } from '@/components/resources/ArticleContent';
import { MarketAnalysisCta } from '@/components/directory/MarketAnalysisCta';
import { DIRECTORY_COUNTRIES, DIRECTORY_HOME_PATH, directoryCountry, directoryPath, companyPath, countryPath, readEmbeddedDirectory, stripHtmlSuffix, type PublicDirectoryCompany } from '@/lib/directory-countries';
import { articlePath, DEMO_URL, fetchPublishedArticles, MARKET_ANALYSIS_PATH, type SeoArticleSummary } from '@/lib/seo-articles';
import { buildDirectoryGuideJsonLd, fetchPublishedDirectoryGuides, guideArticles, guideForCountry, readEmbeddedDirectoryGuides, type DirectoryCountryGuide } from '@/lib/directory-guides';

const CountryGuideSections = ({ guide, country, companies }: {
  guide: DirectoryCountryGuide;
  country: NonNullable<ReturnType<typeof directoryCountry>>;
  companies: PublicDirectoryCompany[];
}) => {
  const { t } = useTranslation();
  return (
    <>
      <section className="mt-10" aria-labelledby="market-overview">
        <h2 id="market-overview" className="font-display text-2xl font-semibold">{t('publicDirectory.overview')}</h2>
        <ArticleContent content={guide.marketOverview} />
      </section>

      {guide.keyFigures.length > 0 && <section className="mt-10" aria-labelledby="key-figures">
        <h2 id="key-figures" className="font-display text-2xl font-semibold">{t('publicDirectory.keyFigures')}</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guide.keyFigures.map(figure => <div key={`${figure.label}-${figure.sourceUrl}`} className="rounded-lg border bg-card p-5">
            <dt className="text-sm font-medium text-muted-foreground">{figure.label}</dt>
            <dd className="mt-2 font-display text-2xl font-semibold text-foreground">{figure.value}{figure.unit ? ` ${figure.unit}` : ''}</dd>
            <dd className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {figure.asOf && <span className="mr-2">{t('publicDirectory.asOf', { date: figure.asOf })}</span>}
              <a href={figure.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">{figure.sourceName}<ExternalLink className="ml-1 inline h-3 w-3" /></a>
            </dd>
          </div>)}
        </dl>
      </section>}

      {guide.demandNotes && <section className="mt-10" aria-labelledby="demand-notes">
        <h2 id="demand-notes" className="font-display text-2xl font-semibold">{t('publicDirectory.demand')}</h2>
        <ArticleContent content={guide.demandNotes} />
      </section>}

      {guide.importerTypes && <section className="mt-10" aria-labelledby="importer-types">
        <h2 id="importer-types" className="font-display text-2xl font-semibold">{t('publicDirectory.importerTypes')}</h2>
        <ArticleContent content={guide.importerTypes} />
      </section>}

      {companies.length > 0 && <section className="mt-10" aria-labelledby="published-examples">
        <h2 id="published-examples" className="font-display text-2xl font-semibold">{t('publicDirectory.examples')}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {companies.map(row => <article key={`${row.countryCode}/${row.slug}`} className="flex flex-col rounded-lg border bg-card p-5">
            <h3 className="font-display text-lg font-semibold"><Link to={companyPath(country, row)} className="text-primary hover:underline">{row.name}</Link></h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{row.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
              <Link to={companyPath(country, row)} className="inline-flex items-center text-primary hover:underline">{t('publicDirectory.viewProfile')}<ArrowRight className="ml-1 h-4 w-4" /></Link>
              <a href={row.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">{t('publicDirectory.website')}<ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
            </div>
          </article>)}
        </div>
        <p className="mt-5 rounded-lg border border-primary/20 bg-secondary/50 p-4 text-sm leading-relaxed text-muted-foreground">{t('publicDirectory.examplesNotice')}</p>
      </section>}

      {guide.howToApproach && <section className="mt-10" aria-labelledby="how-to-approach">
        <h2 id="how-to-approach" className="font-display text-2xl font-semibold">{t('publicDirectory.approach')}</h2>
        <ArticleContent content={guide.howToApproach} />
      </section>}
      <MarketAnalysisCta />

      {guide.faq.length > 0 && <section className="mt-10" aria-labelledby="country-faq">
        <h2 id="country-faq" className="font-display text-2xl font-semibold">{t('publicDirectory.faq')}</h2>
        <div className="mt-5 space-y-6">{guide.faq.map(item => <div key={item.question}>
          <h3 className="font-semibold text-foreground">{item.question}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{item.answer}</p>
        </div>)}</div>
      </section>}

      {guide.sources.length > 0 && <section className="mt-10" aria-labelledby="guide-sources">
        <h2 id="guide-sources" className="font-display text-xl font-semibold">{t('publicDirectory.guideSources')}</h2>
        <ul className="mt-4 space-y-2">{guide.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-primary hover:underline">{source.label}<ExternalLink className="ml-1 h-3.5 w-3.5" /></a></li>)}</ul>
      </section>}
    </>
  );
};

const PublicDirectory = () => {
  const params = useParams();
  const countrySlug = stripHtmlSuffix(params.country);
  const slug = stripHtmlSuffix(params.slug);
  const { t, i18n } = useTranslation();
  const [embedded] = useState(readEmbeddedDirectory);
  const [embeddedGuides] = useState(readEmbeddedDirectoryGuides);
  const [companies, setCompanies] = useState<PublicDirectoryCompany[]>(embedded ?? []);
  const [guides, setGuides] = useState<DirectoryCountryGuide[]>(embeddedGuides ?? []);
  const [articles, setArticles] = useState<SeoArticleSummary[]>([]);
  const [loaded, setLoaded] = useState(Boolean(embedded));
  const country = countrySlug ? directoryCountry(countrySlug) : undefined;
  const name = country ? (i18n.language.startsWith('en') ? country.en : country.fr) : '';
  const company = slug && country ? companies.find(row => row.countryCode === country.code && row.slug === slug) : undefined;
  const missing = Boolean((countrySlug && !country) || (slug && loaded && !company));
  const countryCompanies = country ? companies.filter(row => row.countryCode === country.code) : companies;
  const guide = country && !slug ? guideForCountry(guides, country.code, i18n.language) : null;
  const relatedArticles = guide
    ? guideArticles(guide, articles)
    : articles.filter(article => DIRECTORY_COUNTRIES.some(row => (!country || row.code === country.code) && row.articleSlug === article.slug));
  const path = directoryPath(countrySlug, slug);
  const title = missing ? t('publicDirectory.notFound') : company?.name || (country ? t('publicDirectory.countryTitle', { country: name }) : t('publicDirectory.title'));
  const description = company?.description || (country ? t('publicDirectory.countryDescription', { country: name }) : t('publicDirectory.description'));
  const seoTitle = guide ? guide.metaTitle || t('publicDirectory.guideMetaTitle', { country: name }) : `${title} | WineExporters`;
  const seoDescription = guide ? guide.metaDescription || t('publicDirectory.guideMetaDescription', { country: name }) : description;
  const jsonLd = guide && country ? buildDirectoryGuideJsonLd({
    guide,
    path,
    countryName: name,
    homeLabel: t('publicDirectory.home'),
    directoryLabel: t('publicDirectory.nav'),
    companies: countryCompanies.map(row => ({ name: row.name, path: companyPath(country, row) })),
  }) : undefined;

  useEffect(() => {
    const controller = new AbortController();
    if (!embedded) fetch('/directory-public.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Public directory unavailable'); return response.json(); })
      .then(data => { if (!controller.signal.aborted && Array.isArray(data)) setCompanies(data); })
      .finally(() => { if (!controller.signal.aborted) setLoaded(true); })
      .catch(error => { if (!controller.signal.aborted) console.error('Public directory unavailable', error); });
    fetchPublishedArticles()
      .then(data => { if (!controller.signal.aborted) setArticles(data); })
      .catch(error => { if (!controller.signal.aborted) console.error('Public directory guides unavailable', error); });
    fetchPublishedDirectoryGuides()
      .then(data => { if (!controller.signal.aborted) setGuides(data); })
      .catch(error => { if (!controller.signal.aborted) console.error('Public country guides unavailable', error); });
    return () => controller.abort();
  }, [embedded]);

  return (
    <PublicLayout>
      {/* Published directory: valid country/company pages are indexable; unknown routes, and company pages until data has loaded, stay noindex. */}
      <SEO title={seoTitle} description={seoDescription} path={path} type="website" noindex={missing || Boolean(slug && !company)} jsonLd={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t('publicDirectory.home')}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={DIRECTORY_HOME_PATH} className="hover:text-foreground">{t('publicDirectory.nav')}</Link>
          {country && <><ChevronRight className="h-3 w-3" /><Link to={countryPath(country)} className="hover:text-foreground">{name}</Link></>}
          {company && <><ChevronRight className="h-3 w-3" /><span>{company.name}</span></>}
        </nav>
        <header className="max-w-3xl">
          {country && <span className="mb-3 block text-3xl" aria-hidden="true">{country.flag}</span>}
          <h1 className="break-words font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{guide?.h1 || title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{missing ? t('publicDirectory.notFoundBody') : guide?.intro || company?.description || t('publicDirectory.intro')}</p>
          {guide && <div className="mt-6"><Button asChild><Link to={MARKET_ANALYSIS_PATH}>{t('publicDirectory.guideCta.button')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>}
        </header>

        {guide && country && <CountryGuideSections guide={guide} country={country} companies={countryCompanies} />}

        {!missing && !company && !guide && (
          <>
            {!country && <section className="mt-10">
              <h2 className="mb-4 font-display text-xl font-semibold">{t('publicDirectory.countries')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DIRECTORY_COUNTRIES.map(row => (
                  <Link key={row.code} to={countryPath(row)} className="flex min-h-24 items-center gap-4 rounded-lg border bg-card p-5 transition-colors hover:bg-secondary">
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
          <h2 className="font-display text-2xl font-semibold">{t(guide ? 'publicDirectory.guideFooterTitle' : 'publicDirectory.ctaTitle')}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{t(guide ? 'publicDirectory.guideFooterBody' : 'publicDirectory.ctaBody')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {guide && <Button asChild><Link to={MARKET_ANALYSIS_PATH}>{t('publicDirectory.guideCta.button')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
            <Button asChild variant={guide ? 'outline' : 'default'}><Link to="/demande-demo">{t('publicDirectory.account')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><a href={DEMO_URL} target="_blank" rel="noopener noreferrer">{t('publicDirectory.demo')}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
          </div>
        </section>
        {(countrySlug || missing) && <Link to={DIRECTORY_HOME_PATH} className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" />{t('publicDirectory.back')}</Link>}
      </div>
    </PublicLayout>
  );
};
export default PublicDirectory;
