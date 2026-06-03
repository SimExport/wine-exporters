// Mirror of src/lib/us-states.ts for the Deno edge runtime.
export const US_STATES: readonly string[] = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const CANONICAL_LOOKUP: Map<string, string> = new Map(
  US_STATES.map((s) => [s.toLowerCase(), s]),
);

const US_COUNTRY_KEYS = new Set(["united states", "usa"]);

export function isUsMarket(marketName: string | null | undefined): boolean {
  if (!marketName) return false;
  return US_COUNTRY_KEYS.has(marketName.trim().toLowerCase());
}

export function normalizeUsState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const head = raw.split(",")[0].trim();
  const candidates = [head, head.split("-")[0].trim()];
  for (const cand of candidates) {
    const stripped = cand.replace(/\s+(County|Country)$/i, "").trim();
    const hit = CANONICAL_LOOKUP.get(stripped.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

export function expandUsStateVariants(
  rawStates: (string | null | undefined)[],
  canonicalStates: string[],
): string[] {
  const wanted = new Set(canonicalStates.map((s) => s.toLowerCase()));
  const out = new Set<string>();
  for (const raw of rawStates) {
    if (!raw) continue;
    const canon = normalizeUsState(raw);
    if (canon && wanted.has(canon.toLowerCase())) out.add(raw);
  }
  return Array.from(out);
}