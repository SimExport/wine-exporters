// Canonical country labels (stored in English) so the same country never
// appears as "US", "USA", "United States" and "UNITED KINGDOM" side by side.

const ALIASES: Record<string, string> = {
  // United States
  us: "United States", "u.s.": "United States", "u.s.a.": "United States",
  usa: "United States", "united states of america": "United States",
  "united states": "United States", america: "United States", "etats-unis": "United States",
  "états-unis": "United States",
  // United Kingdom
  uk: "United Kingdom", gb: "United Kingdom", gbr: "United Kingdom",
  "u.k.": "United Kingdom", "great britain": "United Kingdom",
  britain: "United Kingdom", england: "United Kingdom", scotland: "United Kingdom",
  wales: "United Kingdom", "northern ireland": "United Kingdom",
  "united kingdom": "United Kingdom", "royaume-uni": "United Kingdom",
  // Europe
  de: "Germany", deu: "Germany", ger: "Germany", deutschland: "Germany",
  allemagne: "Germany", germany: "Germany",
  nl: "Netherlands", nld: "Netherlands", holland: "Netherlands",
  nederland: "Netherlands", "pays-bas": "Netherlands",
  "the netherlands": "Netherlands", netherlands: "Netherlands",
  be: "Belgium", bel: "Belgium", belgique: "Belgium", belgie: "Belgium",
  "belgië": "Belgium", belgium: "Belgium",
  fr: "France", fra: "France", france: "France",
  es: "Spain", esp: "Spain", espana: "Spain", "españa": "Spain",
  espagne: "Spain", spain: "Spain",
  it: "Italy", ita: "Italy", italia: "Italy", italie: "Italy", italy: "Italy",
  pt: "Portugal", prt: "Portugal", portugal: "Portugal",
  ie: "Ireland", irl: "Ireland", eire: "Ireland", irlande: "Ireland",
  "republic of ireland": "Ireland", ireland: "Ireland",
  ch: "Switzerland", che: "Switzerland", suisse: "Switzerland",
  schweiz: "Switzerland", switzerland: "Switzerland",
  at: "Austria", aut: "Austria", osterreich: "Austria", "österreich": "Austria",
  autriche: "Austria", austria: "Austria",
  dk: "Denmark", dnk: "Denmark", danmark: "Denmark", danemark: "Denmark",
  denmark: "Denmark",
  se: "Sweden", swe: "Sweden", sverige: "Sweden", "suède": "Sweden",
  suede: "Sweden", sweden: "Sweden",
  no: "Norway", nor: "Norway", norge: "Norway", "norvège": "Norway",
  norvege: "Norway", norway: "Norway",
  fi: "Finland", fin: "Finland", suomi: "Finland", finlande: "Finland",
  finland: "Finland",
  pl: "Poland", pol: "Poland", polska: "Poland", pologne: "Poland", poland: "Poland",
  cz: "Czech Republic", cze: "Czech Republic", czechia: "Czech Republic",
  "czech republic": "Czech Republic",
  gr: "Greece", grc: "Greece", hellas: "Greece", "grèce": "Greece",
  grece: "Greece", greece: "Greece",
  lu: "Luxembourg", lux: "Luxembourg", luxembourg: "Luxembourg",
  hu: "Hungary", hun: "Hungary", hongrie: "Hungary", hungary: "Hungary",
  ro: "Romania", rou: "Romania", roumanie: "Romania", romania: "Romania",
  // Rest of the world
  ca: "Canada", can: "Canada", canada: "Canada",
  au: "Australia", aus: "Australia", australie: "Australia", australia: "Australia",
  nz: "New Zealand", nzl: "New Zealand", "nouvelle-zélande": "New Zealand",
  "new zealand": "New Zealand",
  jp: "Japan", jpn: "Japan", japon: "Japan", japan: "Japan",
  cn: "China", chn: "China", chine: "China", china: "China",
  hk: "Hong Kong", hkg: "Hong Kong", "hong kong": "Hong Kong",
  sg: "Singapore", sgp: "Singapore", singapour: "Singapore", singapore: "Singapore",
  kr: "South Korea", kor: "South Korea", "corée du sud": "South Korea",
  "republic of korea": "South Korea", "south korea": "South Korea",
  tw: "Taiwan", twn: "Taiwan", taiwan: "Taiwan",
  mx: "Mexico", mex: "Mexico", mexique: "Mexico", mexico: "Mexico",
  br: "Brazil", bra: "Brazil", brasil: "Brazil", "brésil": "Brazil", brazil: "Brazil",
  ae: "United Arab Emirates", are: "United Arab Emirates", uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates", dubai: "United Arab Emirates",
  za: "South Africa", zaf: "South Africa", "south africa": "South Africa",
  in: "India", ind: "India", inde: "India", india: "India",
};

const LOWERCASE_WORDS = new Set(["of", "and", "the", "du", "de", "da"]);

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part, index) => {
      if (/^(\s+|-)$/.test(part) || part === "") return part;
      if (index > 0 && LOWERCASE_WORDS.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

/** Returns a canonical English country label, or null when unusable. */
export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/\s+/g, " ");
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\.$/, "");
  if (ALIASES[key]) return ALIASES[key];
  const stripped = key.replace(/[.]/g, "");
  if (ALIASES[stripped]) return ALIASES[stripped];
  // Unknown value: keep it, but with consistent casing.
  return titleCase(raw).slice(0, 80);
}
