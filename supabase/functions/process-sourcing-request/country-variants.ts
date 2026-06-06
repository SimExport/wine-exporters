// Pure helpers extracted for unit testing.
// Given a target market name (as picked from buyer_contacts in the UI) and the
// list of all country values found in buyer_contacts, return the set of raw DB
// variants (preserving original casing/whitespace) that should be used in the
// `.in("country", ...)` filter.
//
// Safety net: buyer_contacts.country is stored in English, but legacy/legacy
// callers may still send a French label (e.g. "Thaïlande"). When the literal
// match returns nothing, retry with the English translation.
const FR_TO_EN: Record<string, string> = {
  "allemagne": "Germany",
  "thaïlande": "Thailand",
  "thailande": "Thailand",
  "suède": "Sweden",
  "suede": "Sweden",
  "états-unis": "United States",
  "etats-unis": "United States",
  "royaume-uni": "United Kingdom",
  "belgique": "Belgium",
  "pays-bas": "Netherlands",
  "espagne": "Spain",
  "italie": "Italy",
  "suisse": "Switzerland",
  "autriche": "Austria",
  "danemark": "Denmark",
  "norvège": "Norway",
  "norvege": "Norway",
  "finlande": "Finland",
  "pologne": "Poland",
  "croatie": "Croatia",
  "grèce": "Greece",
  "grece": "Greece",
  "irlande": "Ireland",
  "portugal": "Portugal",
  "république tchèque": "Czech Republic",
  "tchéquie": "Czech Republic",
  "hongrie": "Hungary",
  "japon": "Japan",
  "corée du sud": "South Korea",
  "coree du sud": "South Korea",
  "chine": "China",
  "singapour": "Singapore",
  "viêt nam": "Vietnam",
  "vietnam": "Vietnam",
  "canada": "Canada",
  "mexique": "Mexico",
  "brésil": "Brazil",
  "bresil": "Brazil",
  "australie": "Australia",
  "nouvelle-zélande": "New Zealand",
  "nouvelle-zelande": "New Zealand",
  "afrique du sud": "South Africa",
  "émirats arabes unis": "United Arab Emirates",
  "emirats arabes unis": "United Arab Emirates",
  "inde": "India",
  "philippines": "Philippines",
  "indonésie": "Indonesia",
  "indonesie": "Indonesia",
  "malaisie": "Malaysia",
  "taïwan": "Taiwan",
  "taiwan": "Taiwan",
  "hong kong": "Hong Kong",
};

function matchInDb(
  key: string,
  allCountries: { country: string | null }[],
): string[] {
  const out = new Set<string>();
  for (const row of allCountries ?? []) {
    const c = row?.country;
    if (c && c.trim().toLowerCase() === key) out.add(c);
  }
  return Array.from(out);
}

export function resolveCountryVariants(
  marketName: string,
  allCountries: { country: string | null }[],
): string[] {
  const marketKey = (marketName ?? "").trim().toLowerCase();
  let variants = matchInDb(marketKey, allCountries);

  // FR → EN fallback when the literal name matches nothing.
  if (variants.length === 0) {
    const en = FR_TO_EN[marketKey];
    if (en) {
      variants = matchInDb(en.toLowerCase(), allCountries);
      if (variants.length === 0) variants = [en];
    }
  }

  if (variants.length === 0 && marketName) variants = [marketName];
  return variants;
}