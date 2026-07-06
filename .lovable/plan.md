## Objectif
Deux actions admin par campagne : (1) synchroniser les stats Brevo (ouvertures/clics) et (2) importer les cliqueurs comme leads scorés 4-7/10, en excluant ceux déjà présents.

## Prérequis DB
La table `campaigns` ne stocke pas encore l'ID Brevo. Migration :
- Ajouter `campaigns.brevo_campaign_id bigint` (nullable, index).
- Backfill impossible côté auto → laissé NULL pour les anciennes campagnes ; l'UI proposera un champ pour le saisir à la main si absent (voir §UI).

## Persistance de l'ID Brevo
- `supabase/functions/create-campaign/index.ts` : après `brevoId = createJson?.id`, faire un `UPDATE campaigns SET brevo_campaign_id = brevoId WHERE id = campaign.id`.
- Pour la campagne Yves Loison (déjà envoyée), l'admin saisira l'ID manuellement via l'UI.

## Nouvelle Edge Function `sync-brevo-campaign`
Fichier : `supabase/functions/sync-brevo-campaign/index.ts` (verify_jwt = true, admin-only via `has_role`).

Payload : `{ campaign_id: uuid, mode: 'stats' | 'clicks' | 'both' }`.

Étapes :
1. Auth : `getClaims` puis `has_role(user, 'admin')`. Charger `campaigns.brevo_campaign_id` ; 400 si absent.
2. **Stats** (`mode` in `stats|both`) : `GET https://api.brevo.com/v3/emailCampaigns/{brevoId}` avec header `api-key: BREVO_API_KEY`. Extraire `statistics.globalStats.uniqueViews` et `.clickers` (ou `.uniqueClicks`). UPDATE `campaigns.stats_opens`, `stats_clicks`.
3. **Clics** (`mode` in `clicks|both`) :
   - `GET /v3/emailCampaigns/{brevoId}/statistics` puis pagination `GET /v3/contacts/lists/{listId}/contacts` — plus simple : `GET /v3/emailCampaigns/{brevoId}/reports/clicks` n'existe pas ; on utilise `GET /v3/contacts/campaignStats/{brevoId}` OU on itère sur les URLs cliquées via `GET /v3/emailCampaigns/{brevoId}` (renvoie `statistics.linksStats`) — ces endpoints Brevo donnent des compteurs, pas des emails.
   - Endpoint réel pour lister les emails des cliqueurs : **`GET /v3/emailCampaigns/{brevoId}/reports/clicks/{link}`** (par lien) OU **`GET /v3/contacts/segments`**. Le seul endpoint fiable qui retourne des emails de cliqueurs est **`GET /v3/emailCampaigns/{brevoId}` avec `?statistics=linksStats`** combiné à l'export de **`POST /v3/contacts/exportRecipients`** → asynchrone.
   - Approche retenue : utiliser **`GET /v3/emailCampaigns/{brevoId}` puis pour chaque URL, `GET /v3/emailCampaigns/{brevoId}/reports/clickedLinks`** *si dispo*. Sinon, fallback API : `GET /v3/contacts/lists/{listId}/contacts?modifiedSince=…` filtré par event.
   - **Décision plan** : appeler `POST /v3/contacts/emailCampaigns/exportRecipients` avec `{ recipientsType: "clickers", notifyUrl: null }` → réponse asynchrone contenant un `processId`. Poll `GET /v3/processes/{processId}` toutes les 3s (max 30s) pour récupérer l'URL du CSV, télécharger, parser les emails.
   - Pour chaque email :
     - Skip si présent dans `campaign_interested_contacts` (par email, même campagne) OU `leads` (email + campaign_id).
     - Enrichir via Claude (mêmes prompts que `submit-campaign-interest`, mais forcer score entier **4-7** ; fallback 5).
     - INSERT dans `leads` : `campaign_id`, `email`, `first_name` = partie avant @, `buyer_id = 'click_<ts>_<rand>'`, `status='new'`, `source='click'`, `source_score`, `owner_notes = description`, `last_activity_at = now()`.
4. Retourne `{ opens, clicks, imported_leads, skipped }`.

Sécurité : validation Zod du payload, corsHeaders sur toutes réponses, surface les erreurs Brevo avec status + body.

## UI Admin
Fichier : `src/pages/AdminCampaigns.tsx` (colonne actions de la table). À côté de `CampaignStatsPopover` :

- Nouveau composant `src/components/admin/BrevoSyncButton.tsx` :
  - Bouton "Sync Brevo" (icône `RefreshCw`) → dropdown avec 3 actions : "Sync stats", "Importer les cliqueurs", "Les deux".
  - Si `brevo_campaign_id` NULL → prompt input pour saisir l'ID Brevo (UPDATE campaigns d'abord), puis appelle l'action.
  - Appelle `supabase.functions.invoke('sync-brevo-campaign', { body: { campaign_id, mode } })`.
  - Toast succès avec `{ imported_leads, opens, clicks }` ; toast erreur détaillée si Brevo échoue.
  - Rafraîchit la liste des campagnes après succès.

Pas de changement sur `CampaignStatsPopover` (édition manuelle conservée en repli).

## i18n
Ajouter clés `adminCampaigns.brevoSync.*` (fr/en) : label bouton, options du menu, prompt "Brevo campaign ID", toasts succès/erreur.

## Config
- `supabase/config.toml` : ajouter `[functions.sync-brevo-campaign] verify_jwt = true`.
- Aucun nouveau secret : `BREVO_API_KEY` et `ANTHROPIC_API_KEY` déjà configurés.

## Scoring cliqueurs
Extension du prompt Claude existant : demander score entier **4-7** (fort intérêt passif mais pas déclaratif), avec règles 4=faible signal, 5=standard, 6=bon fit, 7=très bon fit. Fallback 5. Description en anglais, 2-3 phrases, comme `submit-campaign-interest`.

## Fichiers touchés
- migration SQL (ajout `brevo_campaign_id`)
- `supabase/functions/sync-brevo-campaign/index.ts` (nouveau)
- `supabase/functions/create-campaign/index.ts` (persistance ID)
- `supabase/config.toml`
- `src/components/admin/BrevoSyncButton.tsx` (nouveau)
- `src/pages/AdminCampaigns.tsx` (intégration bouton)
- `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`

## Hors scope
- Automatisation cron (déclenchement manuel uniquement, réutilisable plus tard).
- Interface pour ré-enrichir un lead cliqueur existant.
