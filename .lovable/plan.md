### Summary
Add the contact email and phone number to both the Kanban cards (Pipeline) and the list table (Prospects) views in the CRM.

### Files to modify

#### `src/pages/Pipeline.tsx` (Kanban cards)
1. Add `phone?: string` to the `Prospect` interface.
2. Import `Mail` and `Phone` from `lucide-react`.
3. In each kanban card, display email and phone below the contact name as compact rows with icons.
   - Only show if the field has a value.
   - Style: `text-xs text-muted-foreground` with `truncate` to fit the narrow card.

#### `src/pages/Prospects.tsx` (List table)
1. Add `phone?: string` to the `Prospect` interface.
2. Import `Mail` and `Phone` from `lucide-react`.
3. Add two new columns in the table header: `Email` and `Phone` (after the existing `Contact` column).
4. Add corresponding cells in each row showing the email and phone values, with icons.
5. Update CSV export headers and rows to include Email and Phone.

#### `src/i18n/locales/fr.json`
- Add `"email": "Email"` and `"phone": "Téléphone"` under `prospects.table`.

#### `src/i18n/locales/en.json`
- Add `"email": "Email"` and `"phone": "Phone"` under `prospects.table`.

### Out of scope
- No database changes (the `leads` table already has a `phone` column and the queries already use `*`).
- No changes to Prospect detail page.