# Plan: Full FR/EN i18n Migration

## 1. Dependencies
Install:
- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector`

## 2. i18n Setup
- **`src/i18n/index.ts`**: Initialize i18next with `LanguageDetector` + `initReactI18next`. Default & fallback = `fr`. Detection order: `['localStorage', 'navigator']`, cache: `['localStorage']`, key: `i18nextLng`.
- **`src/i18n/locales/fr.json`** and **`src/i18n/locales/en.json`**: Namespaced translation files grouped by area:
  - `common` (boutons: save, cancel, delete, loading, error, success, search, …)
  - `nav` (sidebar items, footer)
  - `auth` (login, signup, errors)
  - `dashboard` (KPIs, activity feed, empty states)
  - `profile`, `importers`, `campaigns`, `crm`, `pipeline`, `billing`, `settings`, `roadmap`, `help`, `landing`
  - `credits` (incl. `noCreditsCampaign`, `noCreditsSearch` with `{{date}}` interpolation)
  - `notifications`, `reminders`, `emptyStates`
- Import `./i18n` once in **`src/main.tsx`** before `<App />` renders.

## 3. Language Switcher
- **`src/components/LanguageSwitcher.tsx`**: Compact toggle (FR | EN) using two buttons or a `Toggle`/`Select`. Calls `i18n.changeLanguage()`; selection auto-persists via the detector's localStorage cache. Updates instantly (no reload).
- Mount in:
  - **`src/components/AppSidebar.tsx`** — in `SidebarFooter`, above the notifications bell, visible when sidebar expanded; icon-only when collapsed.
  - **`src/pages/LandingPage.tsx`** — top-right of the public navbar.

## 4. String Externalization
Replace all hardcoded French UI text with `t('namespace.key')` via `useTranslation()`. Files to refactor:

**Layout/shared**
- `src/components/AppSidebar.tsx`, `DashboardLayout.tsx`, `ProtectedRoute.tsx`, `AdminRoute.tsx`
- `CampaignStatusBanner.tsx`, `PreflightBar.tsx`, `CampaignSidebar.tsx`
- `ParseAddressesButton.tsx`, `PremiumOnlyState.tsx`, `ReminderPopover.tsx`
- `LeadsWorldMap.tsx`, `importers/CountrySelector.tsx`, `profile/CountryMultiSelect.tsx`, `profile/WineManagement.tsx`
- `ui/empty-state.tsx` (default copy props)

**Pages** (~19): `LandingPage`, `Auth`, `Dashboard`, `Profile`, `Importers`, `Campaigns`, `CreateCampaign`, `CampaignDetail`, `Prospects`, `Pipeline`, `ProspectDetail`, `DomainProfile`, `Billing`, `Settings`, `Roadmap`, `Help`, `AdminCampaigns`, `NotFound`, `Index`.

**Hooks with user-facing strings**
- `useCredits.tsx` — replace `formatResetDate` (use `i18n.language` for locale) and `noCreditsMessage` with `t('credits.noCredits…', { date })`.
- `useAuth.tsx`, `useNotifications.tsx`, `useSubscription.tsx` — translate toast messages.

## 5. Locale-aware formatting
- Date formatting (`date-fns` `formatDistanceToNow`, `format`) — pick locale from `i18n.language` (`fr` or `enUS`). Centralize in `src/lib/dateLocale.ts`.
- `Date.toLocaleDateString` / `Number.toLocaleString` calls — pass `i18n.language`.

## 6. What stays untranslated
- Brand names: "WineExporters", "ExportVins", "Lovable".
- Database content: importer names, contact data, country values from `buyer_contacts`, campaign names, user-entered notes.
- Continent/country labels already coming from `country-data.ts` (already translated map — leave as-is for now; can be wired to i18n later if needed).
- Proper nouns in roadmap items / help articles when they are product-specific names.

## 7. Memory updates
- **Remove** the Core rule "Exclusively in French. Do not add i18n or English translations." from `mem://index.md`.
- **Add** new memory `mem://features/i18n` describing: react-i18next setup, default `fr`, `localStorage` key `i18nextLng`, switcher locations, JSON file structure, rule to never translate DB data or brand names.
- Update Core to note: "Bilingual FR/EN via react-i18next. Default FR. Never translate DB data or brand names."

## 8. QA checklist
- Toggle FR ↔ EN updates sidebar, dashboard, forms, toasts instantly.
- Refresh persists selection.
- Dates and reset messages reformat per locale.
- No raw translation keys (`xxx.yyy`) visible — every key exists in both files.
- Database-driven content (importer rows, campaign names) stays untouched.

## Scope
~25–30 files edited, 2 new files (`i18n/index.ts`, `LanguageSwitcher.tsx`), 2 JSON locale files (~500 keys each), 3 new deps.
