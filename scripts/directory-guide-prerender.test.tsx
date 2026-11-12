import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/entry-server';
import { APPROVED_PUBLIC_COMPANIES, projectPublicDirectory } from './public-directory';
import { injectPrerender } from './directory-prerender';
import { parsePublishedDirectoryGuide } from '../src/lib/directory-guides';

const companies = projectPublicDirectory(APPROVED_PUBLIC_COMPANIES);
const guide = parsePublishedDirectoryGuide({
  country_code: 'DE', language: 'fr', status: 'published', published_at: '2026-11-01T00:00:00.000Z',
  h1: 'Importateurs de vin en Allemagne : guide de marché et exemples', intro: 'Un guide éditorial fictif pour tester le pré-rendu.',
  market_overview: '## Lecture du marché\n\nContenu fictif visible sans JavaScript.',
  demand_notes: 'Styles fictifs à étudier.', importer_types: 'Importateurs et distributeurs.',
  how_to_approach: 'Présenter clairement ses vins.', meta_title: 'Importateurs de vin en Allemagne : guide',
  meta_description: 'Description fictive du guide de marché allemand.',
  key_figures: [{ label: 'Chiffre fictif', value: '10', unit: 'unités', as_of: '2025', source_name: 'Source fictive', source_url: 'https://example.org/chiffre' }],
  faq: [{ question: 'Question fictive ?', answer: 'Réponse fictive.' }],
  sources: [{ label: 'Source fictive', url: 'https://example.org/marche' }], related_article_slugs: [],
}, new Date('2026-11-12T00:00:00.000Z'))!;

test('initial directory HTML includes a published guide, and all historical routes still render without one', async () => {
  const globals = globalThis as { __PUBLIC_DIRECTORY__?: unknown; __PUBLIC_DIRECTORY_GUIDES__?: unknown };
  globals.__PUBLIC_DIRECTORY__ = companies;
  try {
    globals.__PUBLIC_DIRECTORY_GUIDES__ = [guide];
    const published = await render('/annuaire/allemagne.html');
    assert.ok(published.html.includes(guide.h1));
    assert.ok(published.html.includes('Contenu fictif visible sans JavaScript.'));
    assert.ok(published.html.includes('/market-analysis'));
    assert.ok(published.html.includes('Question fictive ?'));
    assert.ok(published.html.includes('Réponse fictive.'));
    for (const company of companies.filter(row => row.countryCode === 'DE')) assert.ok(published.html.includes(company.name), company.name);
    assert.ok(published.head.includes('FAQPage'));
    assert.ok(published.head.includes('ItemList'));
    const initialHtml = injectPrerender('<html lang="en"><head><title>Template</title></head><body><div id="root"></div></body></html>', '/annuaire/allemagne.html', published.head, published.html, JSON.stringify(companies), JSON.stringify([guide]));
    assert.ok(initialHtml.includes('id="public-directory-guides-data"'));
    assert.ok(initialHtml.includes(guide.h1));

    globals.__PUBLIC_DIRECTORY_GUIDES__ = [];
    const historical = await render('/annuaire/allemagne.html');
    assert.ok(historical.html.includes('Importateurs de vin — Allemagne'));
    assert.ok(!historical.html.includes(guide.h1));
    assert.ok(!historical.html.includes('Contenu fictif visible sans JavaScript.'));
    for (const company of companies.filter(row => row.countryCode === 'DE')) assert.ok(historical.html.includes(company.name), company.name);

    const home = await render('/annuaire.html');
    assert.ok(home.html.includes('Annuaire des importateurs de vin'));
    const company = await render('/annuaire/allemagne/75cl-distribution.html');
    assert.ok(company.html.includes('75cl Distribution'));
    assert.ok(company.html.includes('https://75cl.wine/'));
    assert.ok(!company.html.includes(guide.h1));
  } finally {
    delete globals.__PUBLIC_DIRECTORY__;
    delete globals.__PUBLIC_DIRECTORY_GUIDES__;
  }
});
