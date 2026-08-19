# Enrichissement des cliqueurs : matching buyer_contacts puis web search

## Objectif

Avant d'appeler Claude pour un cliqueur, chercher la société dans la base `buyer_contacts` (23 500 lignes, 17 600 domaines). Si on la trouve, Claude rédige à partir de données réelles. Sinon, Claude effectue une recherche web avant de rédiger. Les répondants au formulaire ne changent pas.

## Étapes du matching (dans l'ordre, on s'arrête au premier succès)

1. **Email exact** — ligne de `buyer_contacts` dont l'email est identique (insensible à la casse).
2. **Même domaine** — si le domaine n'est pas générique (gmail, yahoo, hotmail, outlook, icloud, aol) : toutes les lignes du même domaine, on garde la plus complète (nombre de champs renseignés parmi company_name, phone, website_url, full_address).
3. **Nom de société** — correspondance avec le nom de société déjà connu pour ce contact, insensible à la casse et aux accents. Les extensions Postgres `unaccent` et `pg_trgm` ne sont pas installées sur ce projet (vérifié), donc l'insensibilité aux accents se fait en TypeScript, pas en SQL :
   - l'étape n'est tentée que si le nom connu, une fois nettoyé (mots vides retirés : wine, wines, vins, sarl, ltd, inc, co, company, the…), fait au moins 5 caractères ;
   - shortlist SQL volontairement permissive : `ilike '%fragment%'` sur `company_name`, avec `.limit(50)`, où `fragment` est le mot significatif le plus long. Si ce mot porte un accent, on lance en plus une seconde requête sur son plus long fragment sans accent (« Château » → `%teau%`), pour que la vérification TypeScript puisse retrouver « Chateau » comme « Château » ;
   - filtrage final en TypeScript avec `normalizeCompany()` (minuscules, accents supprimés, ponctuation et mots vides retirés). Un candidat est retenu si sa chaîne normalisée est **égale** au nom normalisé, ou si l'une **contient entièrement** l'autre.

**Règle « un seul résultat plausible »** : on dédoublonne les candidats retenus sur leur nom normalisé. Exactement un nom distinct → match accepté (si plusieurs lignes portent ce nom, on garde la plus complète, comme à l'étape 2). Zéro, ou deux noms distincts ou plus → l'étape 3 échoue et on bascule sur la recherche web.

Champs récupérés : email, company_name, phone, website_url, country, state, city, full_address, Facebook, Instagram, LinkedIn.

## Comportement de l'IA

- **Société trouvée** : prompt enrichi des données factuelles de la fiche, sans recherche web. Score sur 5-8 (base 5 pour un contact vérifié en base, +1 à +3 selon la pertinence avec le profil du producteur).
- **Aucune société** : appel Anthropic avec l'outil `web_search` (max 3 recherches) à partir du domaine de l'email. Score sur 4-7, comme aujourd'hui.

Dans les deux cas, la sortie JSON garde exactement les mêmes 5 clés : `description`, `company_name`, `country`, `recommended_actions`, `score`, ainsi que le ton directif sans mots hésitants.

## Détails techniques

Fichier modifié : `supabase/functions/enrich-campaign-prospects/index.ts` uniquement.

- Nouvelles constantes `GENERIC_DOMAINS` et `COMPANY_STOPWORDS`, helper `normalizeCompany()` (minuscule, `normalize("NFD").replace(/\p{Diacritic}/gu, "")`, ponctuation et mots vides retirés).
- Nouvelle fonction `findBuyerContact(admin, email, knownCompanyName)` implémentant les 3 étapes ci-dessus (`ilike` sur email ; `ilike '%@domain'` pour l'étape 2 ; une ou deux requêtes `ilike '%fragment%'` sur `company_name` avec `.limit(50)` puis filtrage `normalizeCompany()` en TypeScript pour l'étape 3), avec tri par complétude en TypeScript.
- Aucune extension Postgres ajoutée : `unaccent` et `pg_trgm` sont absentes de la base, l'insensibilité aux accents reste côté TypeScript.
- `askClaude(prompt, useWebSearch)` : ajoute `tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }]` quand `useWebSearch` est vrai.
- Parsing adapté : filtrer `data.content` sur `type === "text"` et prendre le **dernier** bloc texte avant le nettoyage des fences et le `JSON.parse` — fonctionne aussi sans web search.
- `clampScore` : plage 4-7 en mode web search, 5-8 en mode matché ; les formulaires restent 6-10.
- Les règles d'écrasement existantes de `company_name` / `country` sont conservées ; quand le match Supabase fournit ces valeurs, elles priment sur la suggestion de Claude.
- Aucun changement de schéma, d'UI ou de la branche « formulaire ».

## À noter

Le nom de société connu utilisé à l'étape 3 est celui déjà stocké sur la ligne du prospect (renseigné à l'import Brevo). Il n'est pas relu depuis l'API Brevo pendant l'enrichissement — l'ajouter nécessiterait un appel Brevo supplémentaire dans cette fonction, à faire seulement si vous le souhaitez.
