// React-free presentation helpers for the producer-facing /opportunites page.
// Stored data is never modified: internal admin notes stay in the database,
// they are only hidden from user surfaces (cards, search, CRM snippet).

const INTERNAL_PATTERNS: RegExp[] = [
  /\btally\b/i,
  /exportvins/i,
  /reconfirm/i,
  /non\s+renouvel/i,
  /not\s+renewed/i,
  /contr[oô]le\s+manuel/i,
  /manual\s+(review|check|verification)/i,
  /formulaire\s+re[cç]u/i,
  /(original\s+)?request\s+(submitted|received)/i,
  /inquiry\s+(submitted|received|via)/i,
  /demande\s+directe\s+re[cç]ue/i,
  /prospect\s+identifi/i,
  /identified\s+by\s+wineexporters/i,
  /\b(recherche|int[ée]r[êe]t|demande)\s+ant[ée]rieur/i,
  /\bpreviously\b/i,
  /\bprevious\s+(interest|request|search)/i,
  /\bv[ée]rifi(cation|[ée]e?s?)\s+(interne|par)/i,
  /\binternal\s+(note|check|verification)/i,
  /ne\s+contactez\s+pas/i,
  /do\s+not\s+contact/i,
  /n[’']a\s+pas\s+autoris[ée]/i,
  /did\s+not\s+authori[sz]e/i,
  /r[ée]ponses?\s+centralis[ée]/i,
  /adresse\s+d[’']exp[ée]dition|shipping\s+address/i,
  /adresse\s+(fournie|de\s+livraison|pour\s+les\s+[ée]chantillons)/i,
  /(sample|delivery)\s+address|address\s+(provided|for\s+(the\s+)?samples)/i,
  /avant\s+exp[ée]dition|before\s+(shipping|dispatch)/i,
  /site\s+(web\s+)?de\s+l[’']entreprise\s+indique|company[’']?s?\s+website\s+(states|shows|lists|indicates)/i,
];

export function isInternalNote(sentence: string): boolean {
  return INTERNAL_PATTERNS.some(p => p.test(sentence));
}

/** Keeps only the commercial buyer needs; returns '' when nothing remains. */
export function cleanBuyerRequirements(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .split(/\r?\n/)
    .map(line => line
      .split(/(?<=[.!?])\s+(?=\S)/)
      .filter(s => s.trim() && !isInternalNote(s))
      .join(' ')
      .trim())
    .filter(line => line && !/^[•\-–*\s]*$/.test(line))
    .join('\n')
    .trim();
}
