# Importer profiles V1 — preview only

## Connection status
The UI is implemented on `/importers`. Its default repository returns `not-connected`; it makes no enrichment requests and consumes no credits. No migration, Edge Function deployment, table change or publication was performed.

## Authorization blocker verified read-only
Live database checks on 2026-10-21 confirmed:
- `authenticated` has UPDATE privilege on `profiles.subscription_plan`.
- The own-profile UPDATE policy allows `auth.uid() = user_id`; there is no protection trigger for subscription fields (only the updated-at trigger).
- `has_premium_access` accepts any non-null subscription plan different from `none`, alongside protected admin/paid roles.

Therefore this helper alone is not a trustworthy subscription authorization boundary for newly exposing enrichment data. This V1 deliberately leaves RLS and grants unchanged. Existing account access was not changed.

## Approval needed before connection/deployment
1. Approve protection of subscription/access fields against user writes, covering both INSERT and UPDATE while preserving normal profile editing and service/admin synchronization.
2. Confirm whether legitimate paid invitations and admins, as well as Stripe subscribers, receive enrichment access.
3. Approve a minimal server-authorized read RPC deriving identity from `auth.uid()`, with explicit access checks, an allowlist of returned fields and no direct SELECT grants on enrichment tables. Never accept a caller-selected user ID as authorization.
4. Test anonymous, Free, trial (invited/active/expired), paid invite, subscriber and admin access, including forged subscription values, before enabling the repository.
5. Agree on validated enrichment statuses. Current records are `partial` or `review_needed`; the UI conservatively reserves the badge for a sourced high-confidence `verified`/`validated` description.

## Implementation
- `src/components/importers/ImporterProfileSheet.tsx`: accessible dialog, large right panel, full-screen below 1024px, one-column reading, internal scroll, X/Escape, loading/error/retry/neutral states.
- `src/lib/importer-profile.ts`: typed injectable repository and factual presentation safeguards; no client or service-role key.
- `src/pages/Importers.tsx`: name/row opens panel; interactive controls do not open it. Country, search, pagination, selections, quotas and exports are untouched.
- `src/i18n/locales/importer-profile.ts` and `src/i18n/index.ts`: isolated FR/EN translations.
- `src/index.css`: feature-scoped heading token and desktop width.

## Verification
- `bun test src/lib/importer-profile.test.ts`: 5 passing tests (badge reliability, sourced direct import confirmation, complete language selection, safe external URLs, disconnected default).
- Playwright isolated rendering in the running preview at 1280×1800 and 390×844: enriched/empty/disconnected/loading/error/retry, FR/EN, X/Escape, full-screen width, internal scrolling, no page errors.
- Browser test fixtures are injected only into temporary browser memory; no test contacts are saved or shipped in the app.
- Authenticated `/importers` end-to-end selection/filter/export regression checks remain unverified: this external Supabase project has no managed test session. No credentials requested or real quotas consumed.