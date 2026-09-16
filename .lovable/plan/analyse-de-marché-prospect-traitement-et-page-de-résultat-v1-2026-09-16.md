# Analyse de marché prospect : traitement et page de résultat (V1)

Après l'envoi du formulaire public `/market-analysis`, la demande est analysée automatiquement, puis le prospect est redirigé vers une page de résultat privée qui présente jusqu'à 10 importateurs prioritaires, une synthèse et une approche recommandée. Les coordonnées réelles ne sont jamais envoyées au navigateur.

## Ce que verra le prospect

1. Après « Analyser mon marché » : un écran d'attente sobre — « Nous analysons votre domaine et les importateurs disponibles sur ce marché. » puis « Nous comparons actuellement les profils les plus pertinents. » Aucun pourcentage inventé.
2. Quand l'analyse est prête : redirection vers `/market-analysis/result/<identifiant>`, page non indexée (`noindex, nofollow`), absente du menu et du sitemap.
3. La page de résultat : en-tête « Votre analyse est prête » + « Nous avons identifié X importateurs à contacter en priorité sur le marché {pays} », rappel discret domaine · localisation · cœur de gamme, badge « Analyse personnalisée WineExporters ».
4. « Ce que nous retenons pour votre domaine » (synthèse) puis « Approche recommandée » (3 points).
5. « X importateurs à contacter en priorité » : une carte par société (nom, ville/pays, site web, score /10, justification 1-2 phrases) avec une zone de coordonnées masquée purement décorative, et la mention « Les coordonnées directes sont volontairement masquées dans cette analyse. Elles sont disponibles dans WineExporters. »
6. Bloc de repositionnement produit (texte fourni) avec le parcours Identifier → Contacter → Suivre → Relancer → Convertir.
7. Bloc CTA final « Découvrir WineExporters en démo », qui pointe vers la page de demande de démo existante (`/demande-demo`).
8. États propres : en cours, échec (« Nous n'avons pas pu finaliser votre analyse pour le moment. » avec bouton Réessayer sur la même demande), et cas « aucun importateur pertinent » sans résultat inventé.

Textes FR et EN via i18n, comme le formulaire.

## Détails techniques

### Base de données (une seule migration)

`prospect_market_searches` : ajout de `result_json jsonb`, `result_summary text`, `processing_error text`, `processed_at timestamptz`, tous nullables. `status` existe déjà (défaut `new`) ; statuts utilisés : `new`, `processing`, `completed`, `failed`.

RLS inchangée : aucune policy de lecture publique ajoutée. La seule policy reste l'insertion pour `anon`/`authenticated`. `buyer_contacts` reste inaccessible publiquement.

### Edge Functions (2 nouvelles, aucune existante modifiée)

**`process-prospect-market-analysis`** (`verify_jwt = false`, appelée avec la clé anon depuis le formulaire) — corps : `{ prospect_market_search_id }`.

- Charge la ligne via le service role. Idempotence : `completed` → sortie immédiate ; `processing` depuis moins de 5 min → 409. Sinon `status = processing`, `processing_error = null`.
- Pool : `buyer_contacts` filtrés sur `country` avec les variantes du pays résolues par le helper existant (`process-sourcing-request/country-variants.ts`, copié dans `_shared/` sans modifier l'original), limite 500 lignes.
- Préfiltrage déterministe, sans IA : exclusion des lignes sans `company_name` ou sans `email` ; déduplication par nom de société normalisé puis par domaine de site web / domaine d'email ; score technique interne (site +3, email +2, téléphone +1, ville +1, email non-webmail +1, domaine email cohérent avec le site +1). Tri décroissant, priorité aux sociétés avec site web, 30 candidats maximum (moins si le marché en offre moins ; jamais bloquant). Ce score n'est ni stocké ni affiché.
- Enrichissement web serveur-side, sans IA et sans moteur de recherche : `fetch` de la homepage (timeout 6 s), puis au maximum 2 pages internes repérées dans les liens de la homepage par mots-clés (about/company/qui-sommes-nous ; portfolio/wines/producers/brands/vins). 3 pages maximum par société, pas de crawl récursif. Extraction du texte par retrait de `<script>`/`<style>`/balises, décodage des entités, normalisation des espaces, troncature à 4 000 caractères par société toutes pages confondues. Concurrence limitée (lots de 5) ; toute page inaccessible est ignorée sans faire échouer l'analyse.
- **Un seul appel Anthropic** par analyse (`claude-sonnet-4-5`, même appel HTTP que les fonctions existantes, secret `ANTHROPIC_API_KEY` déjà configuré). Prompt système et prompt utilisateur exactement ceux fournis. Les candidats sont envoyés avec `buyer_contact_id`, `company_name`, `city`, `country`, `website_url`, un booléen de complétude des coordonnées et `website_text` — aucun email ni téléphone complet.
- Validation stricte : JSON parsable, `shortlist` tableau de 10 éléments maximum, `score` entier 1-10, chaque `buyer_contact_id` présent dans le pool envoyé, `company_name`/`website_url`/`city` réalignés sur les valeurs de la base (aucune société inventée, aucune coordonnée ajoutée par le modèle), `market_summary` non vide, `recommended_approach` tableau. En cas d'échec : `status = failed` + message dans `processing_error`, aucun résultat partiel. En cas de succès : `result_json`, `result_summary = market_summary`, `status = completed`, `processed_at = now()`.
- Si le pool est vide : `status = completed` avec une shortlist vide, pour afficher l'état « aucun importateur pertinent » sans appeler Claude.

**`get-prospect-market-analysis`** (`verify_jwt = false`) — corps : `{ prospect_market_search_id }`. Lit la ligne via le service role et ne renvoie qu'une version assainie : `status`, `winery_name`, `winery_location`, `export_price_range`, `target_country`, et pour un statut `completed` la shortlist (`company_name`, `city`, `country`, `website_url`, `score`, `reason`), `market_summary`, `recommended_approach`. Jamais d'email, de téléphone, de `buyer_contact_id`, ni de données d'autres demandes. L'identifiant reste l'UUID aléatoire (`gen_random_uuid()`), non prédictible.

Le frontend n'effectue donc aucun `SELECT` sur `prospect_market_searches`.

### Frontend

- `src/pages/MarketAnalysis.tsx` (modification minimale) : après l'insert réussi (avec `.select("id").single()` pour récupérer l'identifiant), appel de `process-prospect-market-analysis`, affichage de l'écran d'attente, puis redirection vers `/market-analysis/result/<id>`. L'appel de traitement n'attend pas la fin de la requête HTTP : la page de résultat interroge le statut. Design et étapes du formulaire inchangés.
- `src/pages/MarketAnalysisResult.tsx` (nouveau) : interrogation de `get-prospect-market-analysis` toutes les 5 s tant que le statut est `new`/`processing` (arrêt après ~4 min avec message d'échec), rendu des 5 blocs, bouton Réessayer en cas d'échec (relance la même demande, sans nouvelle ligne), `SEO ... noindex`.
- `src/App.tsx` : ajout de la route publique `/market-analysis/result/:id`, hors `DashboardLayout` et hors `ProtectedRoute`. Aucun lien de navigation, aucune entrée de sitemap.
- `src/i18n/locales/fr.json` / `en.json` : clés `marketAnalysisResult.*` et `seo.marketAnalysisResult`. Le texte du bloc de repositionnement et le CTA sont ceux fournis.
- `supabase/config.toml` : `verify_jwt = false` pour les deux nouvelles fonctions.

### Coût et périmètre

- **1 seul appel Anthropic par analyse** (jamais un par société), plus au maximum ~90 requêtes HTTP légères vers les sites des importateurs (30 sociétés × 3 pages), sans service payant.
- **`process-sourcing-request` et la recherche sur-mesure des abonnés restent strictement inchangés** : aucun fichier de cette fonction n'est modifié, aucun crédit utilisateur n'est consulté ni décrémenté pour l'analyse prospect, le système de crédits n'est pas touché. Le helper de variantes de pays est copié dans `_shared/`, l'original reste en place.
- Non inclus : limitation à une demande par email (volontairement reportée), notification email, interface admin pour ces demandes, page de politique de confidentialité.

## Point à valider

Le CTA final pointe vers la page de demande de démo existante `/demande-demo`. Dites-moi si vous préférez une autre destination.
