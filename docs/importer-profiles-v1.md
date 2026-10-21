# Importer profiles V1 — connected, preview only

## Connection status
The UI on `/importers` is connected to Supabase via the `get_importer_profile` RPC. No Edge Function deployment, no table change, no publication was performed.

## Authorization model
Same perimeter as the `/importers` page itself: any authenticated user, whatever their subscription, except ExportVins CRM trial accounts (which `PremiumGate` already blocks from the page). No premium/Stripe/subscription_plan condition was added; the known `subscription_plan` editability issue is out of scope for this V1.

- `public.get_importer_profile(uuid)`: SECURITY DEFINER, STABLE, `SET search_path TO 'public'`.
- Raises `Not authenticated` when `auth.uid()` is null; `Forbidden` for `is_exportvins_trial_user(auth.uid())`.
- Returns a fixed field allowlist from `buyer_contact_enrichments`, `buyer_contact_enrichment_people`, `buyer_contact_enrichment_emails`, `buyer_contact_enrichment_evidence` as one jsonb document. All enrichment statuses are returned (`verified`, `partial`, `review_needed` describe enrichment progress, not rejection); the UI's factual safeguards still reserve the "Profil enrichi" badge for sourced high-confidence `verified`/`validated` descriptions.
- `REVOKE ALL ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`. No direct SELECT grant on the enrichment tables; RLS unchanged; `buyer_contacts` untouched.

## Verified against the live database (2026-10-21)
- Anonymous REST call: `42501 permission denied for function`.
- Authenticated non-trial user (role `authenticated` + JWT sub): enriched contact returns `enrichment` (status `review_needed`), 1 person, evidence; non-enriched contact returns `{enrichment: null, people: [], emails: [], evidence: []}`.
- Active ExportVins trial user: `P0001 Forbidden`.
- Direct table read as `authenticated` remains denied (no SELECT grant leaked).

## Remaining verification
- In-browser authenticated run of `/importers` (open sheet, FR/EN, with/without enrichment): not done — this external Supabase project provides no managed test session in the sandbox.
- The Supabase linter flags this new function like the 24 pre-existing authenticated SECURITY DEFINER functions; EXECUTE is intentionally restricted to `authenticated` per the design above.

## Implementation
- `src/components/importers/ImporterProfileSheet.tsx`: accessible dialog, large right panel, full-screen below 1024px, one-column reading, internal scroll, X/Escape, loading/error/retry/neutral states.
- `src/lib/importer-profile.ts`: typed injectable repository (default calls the RPC, maps `restricted`/`ready`, lazily imports the Supabase client), `mapProfileResponse` payload mapping, factual presentation safeguards; no client or service-role key.
- `src/pages/Importers.tsx`: name/row opens panel; interactive controls do not open it. Country, search, pagination, selections, quotas and exports are untouched.
- `src/i18n/locales/importer-profile.ts` and `src/i18n/index.ts`: isolated FR/EN translations.
- `src/index.css`: feature-scoped heading token and desktop width.

## Verification
- `bun test src/lib/importer-profile.test.ts`: 5 passing tests (badge reliability, sourced direct import confirmation, complete language selection, safe external URLs, disconnected default).
- Playwright isolated rendering in the running preview at 1280×1800 and 390×844: enriched/empty/disconnected/loading/error/retry, FR/EN, X/Escape, full-screen width, internal scrolling, no page errors.
- Browser test fixtures are injected only into temporary browser memory; no test contacts are saved or shipped in the app.
- Authenticated `/importers` end-to-end selection/filter/export regression checks remain unverified: this external Supabase project has no managed test session. No credentials requested or real quotas consumed.