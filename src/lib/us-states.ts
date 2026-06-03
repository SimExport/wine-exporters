// Canonical list of US federal states + DC, and a normalizer to map noisy
// `buyer_contacts.state` values (e.g. "California, Napa County",
// "Florida-Dade County", "Illinois, Cook County, Bremen Township") back to a
// single canonical state name.

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

/**
 * Normalize a raw `state` value to a canonical US state name.
 * Returns null if the raw value does not map to a known US state.
 */
export function normalizeUsState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Take the part before the first comma, then strip a trailing " County" or
  // " Country" suffix. Then also try splitting on '-' to catch
  // "Florida-Dade County" → "Florida".
  const head = raw.split(",")[0].trim();
  const candidates = [head, head.split("-")[0].trim()];
  for (const cand of candidates) {
    const stripped = cand.replace(/\s+(County|Country)$/i, "").trim();
    const hit = CANONICAL_LOOKUP.get(stripped.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/**
 * Given a set of raw state values (from buyer_contacts) and a selected
 * canonical state, return the raw values that normalize to that state.
 */
export function expandStateVariants(
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