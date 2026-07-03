## Scope

Reuse the existing interest-form flow (`campaign_interested_contacts`) — no new table. Extend the pipeline so every submission also creates a CRM lead, and expose a "Formulaires" counter + drawer in Admin Campagnes.

## 1. Edge Function: replace Gemini with Anthropic + create the lead

Update `supabase/functions/submit-campaign-interest/index.ts` only:

- Swap the Lovable AI (Gemini) enrichment for a direct **Anthropic API** call using the existing `ANTHROPIC_API_KEY` secret, model `claude-sonnet-4-5`, max_tokens 1000.
- Fetch the full campaign + owner profile (domain_name, aoc, city/country, target_buyer, strong_points) to feed richer context to Claude.
- Prompt Claude for strict JSON: `{ description: 2–3 sentences about the prospect company, score: 1–5 integer, recommended_actions: bullet list of next steps }`. Fallback to current heuristic if the call fails.
- Continue inserting into `campaign_interested_contacts` with `description`, `recommended_actions`, `score` from Claude.
- **New step** — after the interested-contact insert succeeds, insert a matching row into `public.leads` using existing columns only:
  - `campaign_id`, `email`, `company_name`, `country`, `phone`
  - `first_name` / `last_name` split from `full_name` (first token = first_name, remainder = last_name)
  - `status = 'new'`
  - `source = 'interest_form'`, `source_score = <claude score>`
  - `owner_notes = <claude description>`
  - `requested_actions = <array of selected interest slugs>` (column is already `text[]`)
- Lead insert failure is logged but does not fail the response (form UX stays clean). Confirmation email invocation is unchanged.

RLS: no changes needed. Insert runs with the service role; existing policies let the campaign owner read/update/delete the new lead through `campaigns.user_id = auth.uid()`.

## 2. Admin Campagnes: "Formulaires" column + drawer

Edit `src/pages/AdminCampaigns.tsx` only:

- Fetch a per-campaign count from `campaign_interested_contacts` (single grouped query, joined into the existing campaigns list).
- Add a **Formulaires** column in the campaigns table showing the count as a clickable button (disabled when 0).
- Clicking opens a `Sheet` (drawer) listing every response for that campaign with:
  - Contact name, email, company, country
  - Submitted date (`formatDateTime`)
  - `wants_samples` badge — derived from whether `"samples"` appears in the stored interests (kept from the enriched row; falls back to reading `recommended_actions` text)
  - Status badge: **enriched** when `description` is present, **pending** otherwise
- Read-only drawer. No edits, no new tables, no changes to the user-facing campaign page.

## Out of scope

- No changes to `campaign_interested_contacts` schema, `leads` schema, RLS, or the public `/interest/:campaignId` form UI.
- No touch to `create-campaign`, notifications, or the user-facing "Prospects qualifiés" section.

## Technical notes

- Anthropic call: `POST https://api.anthropic.com/v1/messages` with headers `x-api-key`, `anthropic-version: 2023-06-01`. Parse `content[0].text` as JSON (strip code fences defensively).
- Interests → `requested_actions` mapping: pass the slug array through as-is (matches values already used elsewhere in the CRM).
- Name split helper: `full_name.trim().split(/\s+/)` → `[first, ...rest]`; `last_name = rest.join(' ') || null`.
- Admin count query: `supabase.from('campaign_interested_contacts').select('campaign_id', { count: 'exact', head: false })` grouped client-side into a `Map<campaign_id, number>` to avoid a second migration.
