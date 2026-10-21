# AGENTS
- Importer profile rendering uses a typed, injectable read repository; the default calls the `get_importer_profile` RPC (SECURITY DEFINER, auth.uid() required, ExportVins trial accounts excluded, field allowlist, EXECUTE for `authenticated` only). Never query the enrichment tables directly from the browser.
- Importer profile translations live in a dedicated FR/EN module merged into the common i18n namespace, keeping this feature isolated from the large shared locale files.
- SEO articles live in `seo_articles`; data/meta helpers in `src/lib/seo-articles.ts` stay React-free so a future prerender/SSR can reuse them.
- `/ressources` and `/ressources/:slug` use `ResourcesLayout` (dashboard if signed in, public otherwise); the 8 private resource routes stay behind `DashboardLayout`.
- Article sitemap is served by the `sitemap-articles` Edge Function, referenced in robots.txt; static `public/sitemap.xml` keeps fixed routes.
- Extra access rights (e.g. ExportVins CRM trial) live in `user_entitlements`, not in `app_role`; server gating via RESTRICTIVE RLS + `crm_access_level`/`is_exportvins_trial_user`, so free/paid behaviour stays untouched.
- Premium pages are wrapped by `PremiumGate` in App.tsx so trial accounts never mount the page or fetch its data.
