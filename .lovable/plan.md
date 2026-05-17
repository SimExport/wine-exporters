# Automatisation des recherches sur-mesure

## Note importante sur les statuts existants

La table `sourcing_requests` utilise déjà : `pending | in_progress | validated | archived`.
Votre plan mentionne `processing` et `completed`. Je propose de **réutiliser les statuts existants** pour éviter de casser l'UI admin et les traductions actuelles :
- `processing` → `in_progress`
- `completed` → `validated`

Si vous préférez ajouter `processing`/`completed` comme nouveaux statuts en parallèle, dites-le.

## Étape 1 — Migration SQL

Ajouter à `sourcing_requests` :
- `result_json` jsonb
- `result_summary` text
- `states_filter` text[]
- `processing_started_at` timestamptz
- `processing_completed_at` timestamptz
- `error_message` text

## Étape 2 — Formulaire utilisateur `/recherches`

Dans `src/pages/SourcingRequests.tsx`, dans le `Dialog` de création :
- Après sélection du pays, si `market ∈ { US, GB, DE, AU, CA, CN }` (codes ISO via `COUNTRY_LIST`), afficher un multi-select **États / Régions** (obligatoire, max 3).
- Options chargées via `supabase.from('buyer_contacts').select('state').eq('country', countryName).not('state','is',null)` puis dédup côté client.
  - ⚠️ `buyer_contacts.country` stocke le **nom** (ex: "United States"), pas le code ISO. On mappera via `COUNTRY_LIST.find(c => c.code === market)?.name`.
- Composant : réutiliser le pattern de `CountryMultiSelect` (badges + popover + search) ; nouveau composant léger `StatesMultiSelect`.
- À la soumission : insérer `states_filter` dans `sourcing_requests`, puis invoquer la nouvelle Edge Function `process-sourcing-request` au lieu (ou en plus) de `notify-sourcing-submission`.

## Étape 3 — Edge Function `process-sourcing-request`

Nouveau fichier `supabase/functions/process-sourcing-request/index.ts`, `verify_jwt = false` dans `config.toml`, secret requis : **`ANTHROPIC_API_KEY`** (à ajouter via le tool secrets avant déploiement).

Flux (avec service role key) :
1. Parse `{ sourcing_request_id }`, charge la demande.
2. Vérifie `user_credits.search_credits >= 1` pour `user_id` → sinon 402 + status `pending` conservé, écrit `error_message`.
3. UPDATE : `status='in_progress'`, `processing_started_at=now()`, décrément `search_credits` (RPC `consume_search_credit` n'est pas utilisable hors session user → on fait un UPDATE direct côté service role).
4. Récupère `buyer_contacts` filtrés par `country = nom_du_pays` (+ `state = ANY(states_filter)` si non vide). Limite raisonnable (ex. 500) pour rester dans le contexte du LLM.
5. Récupère `profiles` + `wines` de l'utilisateur.
6. Appel API Anthropic `claude-sonnet-4-5` (endpoint `https://api.anthropic.com/v1/messages`) avec prompt système FR demandant un JSON strict :
   ```json
   { "shortlist": [ { "company_name", "email", "phone", "website_url", "score", "reason" } ], "summary_markdown": "..." }
   ```
   Forcer JSON via instruction + parser robuste.
7. UPDATE : `result_json`, `result_summary`, `status='validated'`, `processing_completed_at`, `validated_at`.
8. Appel Resend (via `RESEND_API_KEY` déjà présent) — email "Votre recherche est prête".
9. En cas d'erreur LLM/parsing : status repasse à `pending`, `error_message` rempli, crédit **remboursé**.

## Étape 4 — Vue utilisateur (résultats)

Dans `SourcingRequests.tsx`, pour chaque ligne :
- `in_progress` → spinner + texte "Recherche en cours…".
- `validated` + `result_json` non null → bouton **"Voir les résultats"** ouvrant un Dialog plein écran :
  - Onglet **Synthèse** : `result_summary` rendu en markdown (`react-markdown` — à ajouter si absent).
  - Onglet **Contacts** : table triable (nom, email, téléphone, site, score badge, raison).
  - Bouton "Export CSV" côté client.
- Si `result_file_url` existe (ancien flux manuel) → garder le bouton Download en fallback.

## Étape 5 — Vue admin `/admin/recherches`

Dans `AdminSourcing.tsx` :
- Bouton **Démarrer** : appelle `supabase.functions.invoke('process-sourcing-request', { body: { sourcing_request_id: req.id } })` au lieu d'un simple `updateStatus('in_progress')`. Toast pendant l'exécution.
- Ligne en `in_progress` : icône `Loader2` animée dans le badge + désactivation des actions.
- Ligne en `validated` avec `result_json` : nouveau bouton **"Voir les résultats"** (même Dialog que côté user) ; le bouton Valider manuel reste disponible en fallback pour upload de fichier.
- Realtime optionnel : `supabase.channel` sur `sourcing_requests` pour rafraîchir auto quand l'edge function termine.

## Étape 6 — i18n

Ajouter clés FR + EN dans `src/i18n/locales/{fr,en}.json` :
- `sourcing.states.label`, `sourcing.states.placeholder`, `sourcing.states.max`
- `sourcing.results.title`, `sourcing.results.viewBtn`, `sourcing.results.summaryTab`, `sourcing.results.contactsTab`, `sourcing.results.score`, `sourcing.results.exportCsv`
- `sourcing.processing.label`
- `adminSourcing.action.viewResults`, `adminSourcing.toast.processingStarted`, `adminSourcing.toast.processingError`

## Détails techniques

- **Secret à ajouter** : `ANTHROPIC_API_KEY` (le user devra le fournir via le formulaire sécurisé).
- **Dépendance npm** : `react-markdown` (+ `remark-gfm`) pour le rendu de la synthèse.
- **Sécurité** : la fonction utilise `SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement. Aucun appel direct à Anthropic depuis le client.
- **Idempotence** : si la fonction est rappelée sur une demande déjà `in_progress` depuis < 5 min, retourner 409.
- **Quota LLM** : tronquer la liste de contacts à 500 max + n'envoyer que les colonnes utiles pour limiter les tokens.

## Ordre d'exécution une fois approuvé

1. Demander l'ajout du secret `ANTHROPIC_API_KEY`.
2. Migration SQL.
3. Edge Function `process-sourcing-request` + entrée dans `config.toml`.
4. UI utilisateur (formulaire états + viewer résultats).
5. UI admin (bouton Démarrer asynchrone + viewer).
6. i18n FR/EN.
