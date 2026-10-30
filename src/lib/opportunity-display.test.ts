import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanBuyerRequirements, isInternalNote } from './opportunity-display.ts';

describe('cleanBuyerRequirements', () => {
  it('removes French mediation and form notes entirely', () => {
    const fr = 'Réponses centralisées chez WineExporters / ExportVins pour contrôle manuel. Cet acheteur n’a pas autorisé les producteurs à le contacter directement via la plateforme. Ne contactez pas l’importateur directement. Formulaire reçu le 27 octobre 2026.';
    assert.equal(cleanBuyerRequirements(fr), '');
  });
  it('removes English mediation notes entirely', () => {
    const en = 'Replies must be sent to WineExporters / ExportVins for manual review. The buyer did not authorize direct contact by producers via the platform. Please do not contact the buyer directly. Original request submitted 27 October 2026.';
    assert.equal(cleanBuyerRequirements(en), '');
  });
  it('keeps real criteria in mixed messages (EN and FR)', () => {
    assert.equal(cleanBuyerRequirements('Full-bodied red wines. Previous interest in high-end wines (July 2026; not reconfirmed).'), 'Full-bodied red wines.');
    assert.equal(cleanBuyerRequirements('Vins rouges corsés. Intérêt antérieur pour le haut de gamme (juillet 2026 ; non reconfirmé).'), 'Vins rouges corsés.');
  });
  it('drops Tally sources and non-renewal history', () => {
    assert.equal(cleanBuyerRequirements('Demande directe reçue via Tally le 28 octobre 2026'), '');
    assert.equal(cleanBuyerRequirements('Recherche antérieure de domaines (septembre 2026 ; non reconfirmée en octobre).'), '');
    assert.equal(cleanBuyerRequirements('Bio. Demande non renouvelée en octobre.'), 'Bio.');
    assert.equal(cleanBuyerRequirements('Prospect identifié par WineExporters. Rosé de Provence.'), 'Rosé de Provence.');
  });
  it('leaves pure commercial needs untouched', () => {
    const t = 'Couteaux Bourguignons Rouge, vintage 2025. Minimum 96 000 L. Blend with minimum 60% Gamay.';
    assert.equal(cleanBuyerRequirements(t), t);
    assert.equal(cleanBuyerRequirements('Organic, brut nature, excw 2.5-3.5'), 'Organic, brut nature, excw 2.5-3.5');
    assert.equal(cleanBuyerRequirements('•\tstrong price-quality ratio\n•\texport experience'), '•\tstrong price-quality ratio\n•\texport experience');
  });
  it('handles empty input', () => {
    assert.equal(cleanBuyerRequirements(null), '');
    assert.equal(isInternalNote('Maximum retail price of €20/bottle'), false);
  });
});
