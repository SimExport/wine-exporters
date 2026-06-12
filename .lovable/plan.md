## Objectif

Stocker les champs structurés (`wine_styles`, `volume`, `origins`, `requirements`, et équivalents tender) en deux versions `_fr` et `_en` au moment de l'import, pour que l'affichage `/opportunites` respecte la langue active du toggle i18n.

## 1. Migration DB

Ajouter sur `importer_requests` :
- `wine_styles_fr`, `wine_styles_en` (text)
- `volume_fr`, `volume_en` (text)
- `origins_fr`, `origins_en` (text)
- `requirements_fr`, `requirements_en` (text, nullable)

Ajouter sur `tender_requests` :
- `category_fr`, `category_en`
- `available_volume_fr`, `available_volume_en`
- `designation_origin_fr`, `designation_origin_en`
- `style_profile_fr`, `style_profile_en`
- `requirements_fr`, `requirements_en`

Les colonnes brutes existantes restent inchangées (debug/admin). Pas de backfill SQL : les lignes existantes seront retraitées via un bouton admin (voir §5).

## 2. Edge Function `translate-opportunity-fields`

Nouvelle fonction Deno, `verify_jwt = false` côté config mais validation JWT + rôle admin en code (utilise `SUPABASE_JWKS`).

- Input : `{ entries: Array<{ id?: string; fields: Record<string,string> }> }` (batch jusqu'à 20 entrées).
- Appelle Anthropic Claude (`ANTHROPIC_API_KEY` déjà configurée) avec un prompt système qui :
  - Précise que les valeurs sources viennent d'un formulaire Tally en anglais.
  - Fournit le glossaire métier vin : `White→Blanc`, `Red→Rouge`, `Rosé→Rosé`, `Sparkling→Effervescent`, `Sweet→Doux`, `Fortified→Muté`, ranges de bouteilles avec espaces fines insécables, noms de pays/régions (`Sweden→Suède`, `Other Europe→Autre Europe`, `New World→Nouveau Monde`, etc.).
  - Renvoie un JSON strict via `response_format`/tool-call structuré : pour chaque champ, `{ fr, en }`. `en` = normalisation légère (trim, casse cohérente). `fr` = traduction.
- Output : `{ results: Array<{ id?: string; translations: Record<string, { fr: string; en: string }> }> }`.
- Fallback en cas d'erreur Anthropic : `{ fr: raw, en: raw }` par champ, jamais d'échec dur côté client.

## 3. Import CSV Tally — preview enrichie

Dans `TallyCsvImporter.tsx` :
- Après parsing CSV, ajouter un bouton **"Traduire la sélection"** qui appelle l'Edge Function pour les lignes cochées et hydrate l'état local avec `wine_styles_fr/en`, `volume_fr/en`, `origins_fr/en`, `requirements_fr/en`.
- Le tableau de preview gagne, sous chaque cellule structurée concernée, deux mini-textareas `FR` / `EN` éditables (compactes, `text-xs`). La colonne brute reste visible en lecture seule au-dessus pour référence.
- Le bouton **"Importer la sélection"** est désactivé tant que les versions `_fr`/`_en` ne sont pas remplies pour les lignes sélectionnées (sinon import direct avec fallback = valeur brute, au choix UX — par défaut on auto-déclenche la traduction si manquante).
- L'insert dans `importer_requests` inclut maintenant les 8 colonnes `_fr`/`_en`.

## 4. Import PDF Tender

Dans `TenderPdfImporter.tsx` :
- Après extraction PDF, appel automatique à `translate-opportunity-fields` pour `category`, `available_volume`, `designation_origin`, `style_profile`, `requirements`.
- Champs éditables FR/EN dans le formulaire de preview avant insert.

## 5. Édition admin (entrées déjà publiées)

Dans `ImporterRequestEditDialog.tsx` et `TenderRequestEditDialog.tsx` :
- Remplacer les champs uniques `Types de vin`, `Volume`, `Origines`, `Message` (resp. `Catégorie`, `Volume disponible`, etc.) par des paires d'inputs `FR` / `EN` côte à côte.
- La colonne brute reste éditable dans une section repliée "Valeur brute (debug)".
- Ajouter en haut du dialog un bouton **"Re-traduire automatiquement"** qui réinvoque l'Edge Function pour cette entrée et pré-remplit les paires FR/EN.

Dans `ImporterRequestsList.tsx` et `TenderRequestsList.tsx` :
- Ajouter un bouton global **"Traduire les entrées manquantes"** qui parcourt en batch les lignes dont au moins un `_fr` ou `_en` est `NULL`, appelle l'Edge Function et `UPDATE` les colonnes. Sert au backfill des 10 lignes Tally + 1 tender déjà en base.

## 6. Affichage `/opportunites`

Dans `Opportunities.tsx` :
- Récupérer la langue active via `i18n.language` (`fr` ou `en`).
- Helper `pickLang(row, base) = row[`${base}_${lang}`] ?? row[base]` (fallback sur brut si `_fr`/`_en` vide, utile en transition).
- Remplacer tous les usages de `wine_styles`, `volume`, `origins`, `requirements` (et équivalents tender) par `pickLang(row, 'wine_styles')` etc.
- `splitMulti()` continue de fonctionner sur les chaînes traduites.
- `countryFlag()` reste appelée sur la valeur EN (mapping plus stable) : utiliser explicitement `row.origins_en` pour la résolution drapeau, et `pickLang(...)` pour le texte affiché.

## 7. Types Supabase

Après l'approbation de la migration, `src/integrations/supabase/types.ts` sera régénéré automatiquement, débloquant l'accès typé aux nouvelles colonnes pour tous les composants ci-dessus.

## Détails techniques

- **Endpoint Anthropic** : `https://api.anthropic.com/v1/messages`, modèle `claude-haiku-4-5` (rapide + suffisant pour de la traduction courte), `max_tokens: 1024`, sortie JSON strict via prompt + parse.
- **Coût** : traduction faite une seule fois à l'import, donc négligeable.
- **Sécurité** : l'Edge Function vérifie `has_role(auth.uid(), 'admin')` avant tout appel Anthropic, pour éviter qu'un user non-admin déclenche des coûts.
- **Glossaire** : injecté dans le system prompt comme `<glossary>…</glossary>` pour cohérence inter-appels.
- **Performance preview admin** : batch de 20 entrées par appel, parallélisé côté front si > 20 lignes.

## Hors-scope

- Pas de table `translations` séparée (colonnes inline = plus simple à éditer + filtrer).
- Pas de traduction live côté frontend (coûteux et instable).
- Pas de changement aux libellés UI déjà gérés par i18next.
- Pas de changement aux autres pages.
