## Objectif

Créer une nouvelle Edge Function `create-campaign` déclenchée depuis le bouton **Valider** dans Admin › Campagnes, qui orchestre : fetch data → génération HTML par Anthropic → création + envoi via Brevo → mise à jour du statut → email de confirmation via Resend.

Aucune modification en dehors de ce périmètre :
- Création du dossier `supabase/functions/create-campaign/index.ts`.
- Petit ajout dans `src/pages/AdminCampaigns.tsx` : dans `validateCampaign`, remplacer la mise à jour directe `status='active'` + l'appel `notify-campaign-validated` par un unique appel à la nouvelle fonction `create-campaign` (qui prend en charge la mise à jour du statut et l'email utilisateur).

## Prérequis secrets

Déjà présents : `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

**Manquant** : `BREVO_API_KEY`. Après approbation du plan, je demanderai à l'utilisateur d'ajouter ce secret via `add_secret` avant de déployer.

## Étapes de la fonction (dans l'ordre, avec try/catch global)

### Step 1 — Fetch Supabase
- Créer un client Supabase avec `SUPABASE_SERVICE_ROLE_KEY`.
- Lire `campaigns` par `campaign_id` (name, user_id, target_markets/markets, + champ éventuel de sélection de vins — voir ci-dessous).
- Lire `profiles` du `user_id` : `domain_name`, `aoc`, `location`, `surface`, `bottles_per_year`, `certifications`, `strong_points`, `target_buyer`, `contact_name`, `contact_email`, `photo_url`.
- Récupérer l'email `auth.users` via `admin.getUserById(user_id)`.
- **Vins associés à la campagne** — avant de coder cette partie, exécuter `read_query` pour inspecter :
  - Les colonnes de `campaigns` (à la recherche d'un champ type `wine_ids uuid[]`, `selected_wines jsonb`, etc.).
  - Les colonnes de `wines` (`campaign_id`, `user_id`).
  - L'existence éventuelle d'une table de jointure (`campaign_wines`, `campaigns_wines`…).
  
  La stratégie de récupération dépend du résultat :
  1. Si `campaigns` contient un array/JSON d'IDs : `SELECT … FROM wines WHERE id = ANY(<ids>)`.
  2. Si table de jointure : jointure classique.
  3. Sinon fallback : tous les vins du `user_id` propriétaire.

  Champs lus : `name`, `color`, `appellation`, `exw_price`, `labels_awards` (ou noms équivalents détectés dans le schéma).

### Step 2 — Anthropic
- `POST https://api.anthropic.com/v1/messages` avec :
  - Headers `x-api-key: ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`.
  - `model: "claude-sonnet-4-6"`, `max_tokens: 4000`.
  - `system` : bloc exact fourni dans la spec utilisateur.
  - `messages[0].content` : résumé structuré (Markdown/YAML) de toutes les données récupérées + dernière ligne :  
    `CAMPAIGN_INTEREST_URL: https://wine-exporters.com/interest/<campaign_id>`.
- Extraire l'HTML retourné (`content[0].text`), puis extraire le `<title>…</title>` pour l'utiliser comme `subject` Brevo. Fallback : nom de la campagne si titre absent.

### Step 3 — Brevo
- Mapping en dur `country → listId` (table exacte fournie, 44 pays).
- Convertir `campaign.target_markets` en `listIds`, dédupliquer, ignorer les pays inconnus (logger un warning).
- `POST https://api.brevo.com/v3/emailCampaigns` avec header `api-key: BREVO_API_KEY` :
  ```json
  {
    "name": "<campaign.name>",
    "subject": "<extracted subject>",
    "sender": { "name": "WineExporters", "email": "simon@exportvins.fr" },
    "recipients": { "listIds": [...] },
    "htmlContent": "<generated html>"
  }
  ```
  (Sender aligné sur le domaine `exportvins.fr` déjà vérifié dans Brevo.)
- Récupérer l'`id` retourné, puis `POST https://api.brevo.com/v3/emailCampaigns/{id}/sendNow`.

### Step 4 — Update Supabase
- `UPDATE campaigns SET status='active', validated_at=now(), admin_reviewer=<callerId if provided> WHERE id=campaign_id`.

### Step 5 — Email Resend au propriétaire
- Via l'API Resend directe (comme `send-interest-confirmation`).
- `from: "WineExporters <simon@exportvins.fr>"`, `to: [user.email]`, `cc: ["simon@exportvins.fr"]`, `reply_to: "simon@exportvins.fr"`.
- `subject: "Your campaign is live — <campaign name> / Votre campagne est en ligne"`.
- Body HTML bilingue **anglais puis français** reprenant le design WineExporters (fond `#0a0a0a`, carte `#111` bord `#1f1f1f`, accent burgundy `#59191F`, texte blanc, Rubik importé, layout centré 600px). Contenu : campagne envoyée aux importateurs des marchés sélectionnés (liste), rapport à venir.

### Error handling
- Chaque étape dans son propre `try`. Sur échec :
  - Log détaillé (`console.error` avec step + statut + body).
  - `UPDATE campaigns SET status='error' WHERE id=campaign_id` (best-effort).
  - Réponse HTTP `500` avec `{ step, error }`.
- L'email Resend (Step 5) est best-effort : un échec log une erreur mais ne repasse pas la campagne en `error` (la campagne est déjà envoyée).

## Intégration côté admin

Dans `src/pages/AdminCampaigns.tsx › validateCampaign` :
- Remplacer le bloc `update campaigns` + `invoke('notify-campaign-validated')` par un seul `supabase.functions.invoke('create-campaign', { body: { campaignId, adminReviewerId } })`.
- Toast d'attente + toast final selon le retour. Sur erreur, ne pas retirer la campagne de la liste locale et afficher `adminCampaigns.validateError`.

## Détails techniques

- Fichier unique : `supabase/functions/create-campaign/index.ts`, headers CORS standards, validation JWT + vérification `has_role admin` en code.
- `fetch` natif pour Anthropic, Brevo et Resend (cohérent avec le reste du projet).
- Mapping pays = constante en tête de fichier ; vérification via `read_query` sur quelques campagnes réelles au moment du code pour confirmer que `target_markets` correspond bien aux clés (sinon ajouter un normaliseur trim/case).
