import { describe, it, expect } from 'vitest';
import { cleanBuyerRequirements, isInternalNote } from './opportunity-display';

describe('cleanBuyerRequirements', () => {
  it('removes French mediation and form notes entirely', () => {
    const fr = 'Réponses centralisées chez WineExporters / ExportVins pour contrôle manuel. Cet acheteur n’a pas autorisé les producteurs à le contacter directement via la plateforme. Ne contactez pas l’importateur directement. Formulaire reçu le 27 octobre 2026.';
    expect(cleanBuyerRequirements(fr)).toBe('');
  });
  it('removes English mediation notes entirely', () => {
    const en = 'Replies must be sent to WineExporters / ExportVins for manual review. The buyer did not authorize direct contact by producers via the platform. Please do not contact the buyer directly. Original request submitted 27 October 2026.';
    expect(cleanBuyerRequirements(en)).toBe('');
  });
  it('keeps real criteria in mixed messages (EN and FR)', () => {
    expect(cleanBuyerRequirements('Full-bodied red wines. Previous interest in high-end wines (July 2026; not reconfirmed).')).toBe('Full-bodied red wines.');
    expect(cleanBuyerRequirements('Vins rouges corsés. Intérêt antérieur pour le haut de gamme (juillet 2026 ; non reconfirmé).')).toBe('Vins rouges corsés.');
  });
  it('drops Tally sources and non-renewal history', () => {
    expect(cleanBuyerRequirements('Demande directe reçue via Tally le 28 octobre 2026')).toBe('');
    expect(cleanBuyerRequirements('Recherche antérieure de domaines (septembre 2026 ; non reconfirmée en octobre).')).toBe('');
    expect(cleanBuyerRequirements('Bio. Demande non renouvelée en octobre.')).toBe('Bio.');
    expect(cleanBuyerRequirements('Prospect identifié par WineExporters. Rosé de Provence.')).toBe('Rosé de Provence.');
  });
  it('leaves pure commercial needs untouched', () => {
    const t = 'Couteaux Bourguignons Rouge, vintage 2025. Minimum 96 000 L. Blend with minimum 60% Gamay.';
    expect(cleanBuyerRequirements(t)).toBe(t);
    expect(cleanBuyerRequirements('Organic, brut nature, excw 2.5-3.5')).toBe('Organic, brut nature, excw 2.5-3.5');
    expect(cleanBuyerRequirements('•\tstrong price-quality ratio\n•\texport experience')).toBe('•\tstrong price-quality ratio\n•\texport experience');
  });
  it('handles empty input', () => {
    expect(cleanBuyerRequirements(null)).toBe('');
    expect(isInternalNote('Maximum retail price of €20/bottle')).toBe(false);
  });
});
