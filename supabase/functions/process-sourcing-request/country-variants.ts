// Pure helpers extracted for unit testing.
// Given a target market name (as picked from buyer_contacts in the UI) and the
// list of all country values found in buyer_contacts, return the set of raw DB
// variants (preserving original casing/whitespace) that should be used in the
// `.in("country", ...)` filter.
export function resolveCountryVariants(
  marketName: string,
  allCountries: { country: string | null }[],
): string[] {
  const marketKey = (marketName ?? "").trim().toLowerCase();
  const variantSet = new Set<string>();
  for (const row of allCountries ?? []) {
    const c = row?.country;
    if (c && c.trim().toLowerCase() === marketKey) {
      variantSet.add(c);
    }
  }
  const variants = Array.from(variantSet);
  if (variants.length === 0 && marketName) variants.push(marketName);
  return variants;
}