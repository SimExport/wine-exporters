import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  landingTestimonials,
  testimonialSpansFullWidth,
} from './landing-testimonials';

const JULIEN_QUOTE =
  "Bravo pour la plateforme, c'est génial ! J'ai de bons contacts et des retours intéressants avec des acheteurs. Je ne regrette pas d'avoir sauté le pas !";

test('Julien Orosquette review is published on the landing page', () => {
  const julien = landingTestimonials.find((t) => t.author === 'Julien Orosquette');
  assert.ok(julien, 'Julien Orosquette testimonial is missing');
  assert.equal(julien!.quote, JULIEN_QUOTE);
  assert.equal(julien!.role, 'Export Manager · Utilisateur WineExporters');
});

test('every landing testimonial has a non-empty verbatim and an author', () => {
  for (const t of landingTestimonials) {
    assert.ok(t.quote.trim().length > 0, 'empty quote');
    assert.ok(t.author.trim().length > 0, 'empty author');
    assert.ok(!t.quote.includes('"'), `unescaped double quote in ${t.author}`);
  }
});

const ALEXANDRE_QUOTE =
  "Je trouve que votre site est très bien conçu, notamment en ce qui concerne la partie CRM, que je trouve particulièrement réussie.";

test('Alexandre Pipilis review is published on the landing page', () => {
  const alexandre = landingTestimonials.find(
    (t) => t.author === 'Alexandre Pipilis, Domaine Giroud',
  );
  assert.ok(alexandre, 'Alexandre Pipilis testimonial is missing');
  assert.equal(alexandre!.quote, ALEXANDRE_QUOTE);
  // Added last, so the four previously live reviews keep their order.
  assert.equal(landingTestimonials[landingTestimonials.length - 1]!.author, 'Alexandre Pipilis, Domaine Giroud');
});

test('no testimonial is invented: authors stay distinct and quotes are not duplicated', () => {
  const authors = landingTestimonials.map((t) => t.author);
  assert.equal(new Set(authors).size, authors.length);
  const quotes = landingTestimonials.map((t) => t.quote);
  assert.equal(new Set(quotes).size, quotes.length);
});

test('first card spans the full width, last card closes an odd row', () => {
  assert.equal(testimonialSpansFullWidth(0, 4), true);
  assert.equal(testimonialSpansFullWidth(1, 4), false);
  assert.equal(testimonialSpansFullWidth(2, 4), false);
  assert.equal(testimonialSpansFullWidth(3, 4), true);
  // 3 cards: full width, then a complete pair — unchanged from before.
  assert.equal(testimonialSpansFullWidth(2, 3), false);
  assert.equal(testimonialSpansFullWidth(0, 0), false);
});

test('the published list keeps the previously live reviews', () => {
  const authors = landingTestimonials.map((t) => t.author);
  assert.ok(authors.includes('Marie Rouanet, Domaine Saint-Cels'));
  assert.ok(authors.includes('Mathilde, vigneronne en Alsace'));
  assert.ok(authors.includes('Arnaud, vigneron à Pessac-Léognan'));
});
