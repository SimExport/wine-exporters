# Plan technique — pages publiques indexables sans JavaScript

Aucun code dans ce plan. Constats vérifiés : Vite 5 + React 18 + `react-helmet-async` (dans `main.tsx`) + i18next ; `vite build` seul ; le plugin `scripts/public-directory.ts` émet déjà `directory-public.json` au build ; routes publiques déclarées dans `App.tsx` (`/`, `/demande-demo`, `/annuaire*`, `/market-analysis`, `/ressources`, `/ressources/:slug`).

## 1. Méthode proposée : pré-rendu maison au build (SSR Vite + `renderToString`)

- Ajouter un point d'entrée serveur `src/entry-prerender.tsx` qui rend l'arbre public avec `StaticRouter`, `HelmetProvider` (contexte récupéré), une instance i18next créée par page (FR par défaut, ressources chargées de façon synchrone) et un QueryClient pré-rempli.
- Script `scripts/prerender.ts` exécuté après `vite build` : `vite build --ssr src/entry-prerender.tsx`, puis pour chaque URL de la liste : rendu HTML, injection dans `dist/index.html` du `<title>`, des meta/canonical/JSON-LD issus de Helmet, et du HTML dans `#root`, écriture du fichier.
- Côté client : `hydrateRoot` uniquement si `#root` contient du HTML pré-rendu, sinon `createRoot` inchangé (pages applicatives intactes).
- Pourquoi pas les alternatives :
  - `react-snap` / Puppeteer : navigateur headless au build, lent, fragile, abandonné.
  - `vite-plugin-ssr`/`vike`, `vite-react-ssg` : imposent leur routeur/structure, refonte de `App.tsx`.
  - Migration TanStack Start : vraie SSR et vrais 404, mais chantier global touchant aussi les routes applicatives ; hors périmètre ici, à garder comme option si le point 2 échoue.
- Garde-fous : constante `MAX_PRERENDER_PAGES` (ex. 500), contrôle que le rendu ne touche ni `window` ni Supabase Auth (les composants publics lisant le navigateur seront protégés par un test `typeof window`).

## 2. Hébergement Lovable : fichier par URL avant fallback

- Documenté : l'hébergement vérifie si le chemin correspond à un fichier réel, sinon sert `index.html`.
- Non documenté, donc non confirmé : la résolution de `/annuaire/royaume-uni/liberty-wines` vers `.../liberty-wines/index.html` (index de dossier), et le comportement avec/sans slash final.
- Étape 0 obligatoire (canari) : publier un seul fichier statique de test sous les deux formes (`dist/annuaire/_canari/index.html` et `dist/annuaire/_canari.html`), puis `curl` sans JS sur le domaine `wine-exporters.com` : statut, `<title>`, corps, redirection éventuelle vers slash final.
- Si aucune forme n'est servie : alternative = migration TanStack Start (SSR natif). Une Edge Function ne peut pas servir le HTML sur le domaine personnalisé, donc ne constitue pas une alternative.
- Canonical toujours sans slash final, cohérent avec le sitemap actuel.

## 3. Articles `seo_articles` au build

- Lecture anonyme avec l'URL et la clé publique déjà présentes dans le projet, via les helpers React-free de `src/lib/seo-articles.ts` (prévus pour ce cas), filtre `status = published`, champs strictement nécessaires.
- Les données sont injectées dans le QueryClient du rendu et sérialisées dans la page (`window.__PRERENDER_DATA__`) pour éviter le clignotement à l'hydratation.
- Échec réseau au build : le build continue, les articles retombent en SPA (journal d'avertissement), jamais de page vide publiée.
- Limite : un article publié après le build n'est pré-rendu qu'au prochain publish ; il reste accessible en SPA et listé par `sitemap-articles`.
- Les 8 routes privées `/ressources/<fixe>` restent exclues.

## 4. Vrai statut 404

- L'hébergement ne documente aucune configuration de statut : un chemin inconnu reçoit `index.html` en 200. Un vrai 404 n'est pas atteignable sur ce stack.
- Mesure réaliste : URL inconnues (pays/entreprise/article absents) → `noindex` côté client (déjà en place pour l'annuaire), absentes du sitemap, et `dist/404.html` généré au cas où l'hébergement l'utiliserait (vérifié au canari).
- Vrai 404 = uniquement avec la migration TanStack Start.

## 5. Impacts et risques

- Build : +1 build SSR (~10–20 s) + rendu de quelques dizaines de pages (<5 s). Fichiers ajoutés : ~40–80, très loin de la limite de 50 000.
- Déploiement : inchangé (Publish). Aucun changement Supabase, RLS ou Edge Function.
- Pages applicatives : non pré-rendues, gardent `index.html` et `createRoot`.
- Risques :
  - Écarts d'hydratation (dates locales, langue détectée depuis localStorage, animations framer-motion) → rendu FR fixe, dates formatées de façon déterministe, test d'absence d'avertissement d'hydratation.
  - Visiteur EN : page servie en FR puis basculée en EN après hydratation (léger flash) ; pas d'URL EN séparée dans cette version.
  - Code public accédant à `window`/`localStorage` au rendu → plantage du script, détecté au build.
  - `/` affiche `AuthenticatedApp` : le pré-rendu sert la landing ; un utilisateur connecté verra brièvement la landing avant redirection.

## 6. Étapes indépendantes et vérifiables

```text
0. Canari hébergement      -> curl sur wine-exporters.com, décide de la suite
1. Annuaire seul           -> /annuaire, 6 pays, entreprises approuvées
2. Pages statiques         -> /demande-demo, /market-analysis
3. Ressources              -> /ressources + articles publiés
4. Accueil                 -> /
5. 404.html + sitemap      -> cohérence sitemap / pages générées
```

Pour chaque étape : tests unitaires (liste d'URL issue du registre, plafond respecté, title/description/canonical/H1 présents dans le HTML sans JS), `npm run build`, vérification Playwright avec JavaScript désactivé, puis après publication `curl` sur le domaine. L'étape 1 réutilise le registre de `scripts/public-directory.ts` comme seule source des URL et est livrable seule.

## Détails techniques

- Fichiers nouveaux : `src/entry-prerender.tsx`, `scripts/prerender.ts` (+ test), script npm `build` = `vite build && vite build --ssr ... && bun scripts/prerender.ts` (à confirmer compatible avec le build Lovable, vérifié à l'étape 0).
- Fichiers modifiés : `src/main.tsx` (hydrate conditionnel), éventuellement `src/i18n` (fabrique d'instance), composants publics listés seulement si un accès navigateur bloque le rendu.
