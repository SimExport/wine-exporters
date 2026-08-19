// Shared buyer_contacts matching logic used by enrich-campaign-prospects and
// sync-brevo-campaign. Behaviour must stay strictly identical between both.

export const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
]);

export const COMPANY_STOPWORDS = new Set([
  "wine",
  "wines",
  "vin",
  "vins",
  "sarl",
  "sas",
  "ltd",
  "limited",
  "llc",
  "inc",
  "co",
  "company",
  "the",
  "and",
  "et",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "gmbh",
  "bv",
  "pty",
  "srl",
  "spa",
]);

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function companyWords(raw: string): string[] {
  return stripAccents(String(raw ?? "").toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !COMPANY_STOPWORDS.has(w));
}

export function normalizeCompany(raw: string): string {
  return companyWords(raw).join(" ");
}

export type BuyerContact = {
  email: string | null;
  company_name: string | null;
  phone: string | null;
  website_url: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  full_address: string | null;
  Facebook: string | null;
  Instagram: string | null;
  LinkedIn: string | null;
};

export const BUYER_FIELDS =
  'email, company_name, phone, website_url, country, state, city, full_address, "Facebook", "Instagram", "LinkedIn"';

export function completeness(c: BuyerContact): number {
  return [c.company_name, c.phone, c.website_url, c.full_address].filter(
    (v) => typeof v === "string" && v.trim() !== "",
  ).length;
}

export function mostComplete(rows: BuyerContact[]): BuyerContact | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => completeness(b) - completeness(a))[0];
}

/** Escape the LIKE wildcards / PostgREST separators in a filter fragment. */
export function likeFragment(s: string): string {
  return s.replace(/[%_,()]/g, " ").trim();
}

export async function findBuyerContact(
  admin: any,
  email: string,
  knownCompanyName: string | null,
): Promise<BuyerContact | null> {
  const cleanEmail = String(email ?? "").trim();
  const domain = cleanEmail.split("@")[1]?.toLowerCase() ?? "";

  // Step 1 — exact email (case-insensitive)
  if (cleanEmail) {
    const { data } = await admin
      .from("buyer_contacts")
      .select(BUYER_FIELDS)
      .ilike("email", likeFragment(cleanEmail))
      .limit(10);
    const hit = mostComplete((data ?? []) as BuyerContact[]);
    if (hit) return hit;
  }

  // Step 2 — same corporate domain
  if (domain && !GENERIC_DOMAINS.has(domain)) {
    const { data } = await admin
      .from("buyer_contacts")
      .select(BUYER_FIELDS)
      .ilike("email", `%@${likeFragment(domain)}`)
      .limit(50);
    const hit = mostComplete((data ?? []) as BuyerContact[]);
    if (hit) return hit;
  }

  // Step 3 — company name (accent-insensitive, verified in TS)
  const known = String(knownCompanyName ?? "").trim();
  const normalizedKnown = normalizeCompany(known);
  if (normalizedKnown.length < 5) return null;

  const words = companyWords(known).sort((a, b) => b.length - a.length);
  const longest = words[0];
  if (!longest || longest.length < 5) return null;

  // Original (possibly accented) counterpart of the longest word, so that we can
  // also probe its longest accent-free fragment (Château -> "teau").
  const rawWords = String(known)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const rawMatch = rawWords.find((w) => stripAccents(w).toLowerCase() === longest);
  const fragments = new Set<string>([longest]);
  if (rawMatch && stripAccents(rawMatch) !== rawMatch) {
    const plainRuns = rawMatch
      .split(/[^\p{L}\p{N}]/u)
      .join("")
      .split("")
      .reduce<string[]>((acc, ch) => {
        if (stripAccents(ch) === ch) {
          acc[acc.length - 1] = (acc[acc.length - 1] ?? "") + ch;
        } else {
          acc.push("");
        }
        return acc;
      }, [""]);
    const longestPlain = plainRuns.sort((a, b) => b.length - a.length)[0] ?? "";
    if (longestPlain.length >= 4) fragments.add(longestPlain.toLowerCase());
  }

  const candidates: BuyerContact[] = [];
  for (const frag of fragments) {
    const { data } = await admin
      .from("buyer_contacts")
      .select(BUYER_FIELDS)
      .ilike("company_name", `%${likeFragment(frag)}%`)
      .limit(50);
    candidates.push(...((data ?? []) as BuyerContact[]));
  }

  const kept = candidates.filter((c) => {
    const n = normalizeCompany(c.company_name ?? "");
    if (!n) return false;
    return (
      n === normalizedKnown || n.includes(normalizedKnown) || normalizedKnown.includes(n)
    );
  });

  const byName = new Map<string, BuyerContact[]>();
  for (const c of kept) {
    const n = normalizeCompany(c.company_name ?? "");
    byName.set(n, [...(byName.get(n) ?? []), c]);
  }
  if (byName.size !== 1) return null;
  return mostComplete([...byName.values()][0]);
}
