## Public Interest Form for Campaigns

### Goal
A fully public page (no auth, no app shell) where qualified buyers can express interest in a producer's wines. The form is scoped to a campaign via URL, and responses are stored for the campaign owner to review.

### Route
`/interest/:campaignId` — standalone page rendered outside `DashboardLayout`, added as a top-level route in `src/App.tsx` before the catch-all.

### Data model
New table `public.campaign_interest_responses`:
- `id` uuid PK
- `campaign_id` uuid (FK → campaigns.id, on delete cascade, indexed)
- `full_name` text NOT NULL
- `email` text NOT NULL
- `company` text
- `country` text
- `interests` text[] NOT NULL DEFAULT '{}' — one or more of:
  - `samples` — Receive samples
  - `price_list` — Request price list
  - `presentation` — Request presentation deck
  - `technical_sheets` — Request technical sheets
  - `visio_call` — Schedule a video call
  - `phone_call` — Schedule a phone call
- `created_at` timestamptz DEFAULT now()

A CHECK constraint ensures every value in `interests` is one of the allowed slugs.

RLS + grants:
- `GRANT INSERT ON ... TO anon, authenticated` (public form) and `GRANT SELECT ON ... TO authenticated` + `GRANT ALL TO service_role`.
- Policy `anon+authenticated can insert` (no restriction on user_id since none stored).
- Policy `Campaign owner can select` using `EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND user_id = auth.uid())`.
- Admins can select via `has_role(auth.uid(), 'admin')`.

### Public campaign info (needed for title)
Campaigns table is private. Add a `SECURITY DEFINER` SQL function:

```
public.get_campaign_public_info(_campaign_id uuid)
returns table(campaign_id uuid, campaign_name text, producer_name text)
```

Returns `campaigns.name` and the owner's `profiles.company_name` (falling back to `user_settings.display_name`). Grant EXECUTE to `anon` and `authenticated`. Only exposes 2 non-sensitive fields — no emails, no user_id.

### Frontend
New file `src/pages/CampaignInterestForm.tsx`:
- Reads `campaignId` from `useParams`.
- On mount, calls `supabase.rpc('get_campaign_public_info', { _campaign_id })`. Shows a 404-style empty state if not found.
- Page layout: centered card on plain background, brand wordmark at top, no sidebar / no navbar / no footer. Bilingual via `useTranslation` (FR default).
- Title: `producer_name` (or campaign_name fallback).
- Subtitle: `"Fill in your details and {producer_name} will get back to you directly within a few days."`
- Form (react-hook-form + zod):
  - `full_name` required, max 120
  - `email` required, valid email, max 255
  - `company` optional, max 200
  - `country` optional, max 100
  - `interests` — group of 6 checkboxes (labels above), any combination allowed, none required. Stored as string[] of slugs.
  - Submit button: "Send my interest" / "Envoyer mon intérêt"
- On submit → `supabase.from('campaign_interest_responses').insert(...)`. On success, replace form with a success state: `"Thank you! {producer_name} will be in touch shortly."` No redirect, no navigation.
- SEO: `<SEO>` with title `"{producer_name} — Interest form"` and `noindex`.

### i18n keys
Add under `interestForm.*` in both `fr.json` and `en.json`: title fallback, subtitle template, field labels, placeholders, `interests.title` ("What are you interested in?") + one label per slug (samples, price_list, presentation, technical_sheets, visio_call, phone_call), submit, success, notFound, errorGeneric.

### App wiring
`src/App.tsx`: add `<Route path="/interest/:campaignId" element={<CampaignInterestForm />} />` above the `*` route, outside `DashboardLayout`, no auth guard.

### Out of scope
- Notifying the campaign owner by email on new response (later via trigger + edge function).
- Admin/owner UI to browse responses on `CampaignDetail`.
- Rate limiting / captcha.