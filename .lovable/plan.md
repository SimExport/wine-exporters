## Summary
Add a "Marquer terminée" button in /admin/campaigns so the admin can manually mark a campaign as completed (status `results`). The button appears for campaigns currently in `active`, `approved`, or `sending` status.

## What will change

### 1. AdminCampaigns.tsx
- Add a `markCampaignCompleted(id, name)` function that:
  - Shows a `confirm()` dialog before updating
  - Updates the campaign's status to `results` in Supabase
  - Updates local state optimistically so the row reflects the new purple "Terminée" badge immediately
  - Shows a success toast on completion
- In the Actions column (table row), add a new button with the `CheckCircle` icon and an outline style for campaigns with status `active`, `approved`, or `sending`.
- Keep all existing buttons (Validate, Reject, Add Prospect, View Prospects) untouched.

### 2. i18n translations
Add the following keys to both `fr.json` and `en.json` under the `adminCampaigns` object:
- `markCompletedConfirm` — confirmation message before marking a campaign as completed
- `completedTitle` — toast title on success
- `completedDesc` — toast description on success (accepts `{{name}}`)
- `markCompletedError` — toast error message
- `table.markCompleted` — button label ("Marquer terminée" / "Mark completed")

## Out of scope
- No automatic email sent to the client when the campaign is closed
- No new database table or RLS changes needed — the `results` status already exists