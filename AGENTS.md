# AGENTS
- SEO articles live in `seo_articles`; data/meta helpers in `src/lib/seo-articles.ts` stay React-free so a future prerender/SSR can reuse them.
- `/ressources` and `/ressources/:slug` use `ResourcesLayout` (dashboard if signed in, public otherwise); the 8 private resource routes stay behind `DashboardLayout`.
- Article sitemap is served by the `sitemap-articles` Edge Function, referenced in robots.txt; static `public/sitemap.xml` keeps fixed routes.
