Add a small "Vu" ("Seen") badge on each opportunity card (both direct requests and tenders) once the current user has opened/viewed it, so users can tell at a glance which opportunities they've already reviewed when they come back.

## What to build

1. **New table `opportunity_views`** (per-user, per-opportunity view tracking)
   - Columns: `id uuid pk`, `user_id uuid`, `opportunity_type text` ('importer' | 'tender'), `opportunity_id uuid`, `viewed_at timestamptz default now()`
   - Unique constraint on `(user_id, opportunity_type, opportunity_id)`
   - RLS: users can only select/insert their own rows. Standard GRANTs to `authenticated` + `service_role`.

2. **`Opportunities.tsx`** — track and display views
   - On load, fetch the user's `opportunity_views` alongside importers/tenders and build a `Set<string>` of viewed keys (`type:id`).
   - Mark a card as viewed when the user interacts with it in a meaningful way. Two triggers:
     - Clicking "Répondre" (opens contact dialog) → record view.
     - Clicking "Ajouter au CRM" → record view.
   - After successful insert (ignore duplicates with `onConflict`), update local `viewedKeys` set so the badge appears immediately.
   - Render a small badge in the card header (next to the country/date) when the card is in `viewedKeys`: subtle `variant="secondary"` with an eye icon and label "Vu" / "Seen".

3. **i18n** — add `opportunitiesPage.states.seen` = "Vu" (FR) / "Seen" (EN).

## Technical notes

- Table lives in `public`; migration includes CREATE TABLE, GRANTs (authenticated + service_role, no anon), ENABLE RLS, and two policies (select own, insert own).
- Insert uses `.upsert({...}, { onConflict: 'user_id,opportunity_type,opportunity_id', ignoreDuplicates: true })` so repeated views are cheap no-ops.
- Badge uses existing shadcn `Badge` + `Eye` icon from lucide-react; positioned in the top-right area of each card header alongside the date/deadline.
- No change to admin flows or notification emails.

## Out of scope

- Auto-marking as viewed on scroll/impression (kept simple: view = user clicked to interact).
- Filtering/sorting by viewed status (could add later if useful).