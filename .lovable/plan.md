## Objectif

Permettre à l'admin d'uploader un rapport de campagne pour un client. Le client le voit dans `/campaigns` et reçoit un email automatique.

## 1. Base de données

Nouvelle table `campaign_reports` :
- `user_id` (référence le client)
- `campaign_name` (nom affiché)
- `file_url` (URL publique du fichier)
- `file_name`, `file_size`, `file_format` (html/pdf) pour l'affichage
- `notified_at` (horodatage de l'envoi email)

RLS :
- Client : lecture de ses propres rapports
- Admin : insert + select + delete
- GRANTs aux rôles `authenticated` et `service_role`

## 2. Storage

Nouveau bucket public `campaign-reports`. Path : `{user_id}/{timestamp}-{filename}`. Policies storage :
- Lecture publique
- Upload réservé aux admins (via `has_role`)

## 3. Edge Function `notify-campaign-report`

Déclenchée par un Database Webhook sur INSERT dans `campaign_reports`.

- Récupère l'email via `auth.admin.getUserById`
- Récupère le nom via `profiles.contact_name` (champ existant dans ce projet, pas `first_name`)
- Envoie l'email via Resend (clé `RESEND_API_KEY` déjà configurée)
- Expéditeur : `simon@exportvins.fr` — sujet et template HTML bilingue FR, bouton "Consulter mon rapport" pointant vers `https://wine-exporters.com/campaigns`
- Met à jour `notified_at`
- `verify_jwt = false` dans `config.toml` (appelé par webhook)
- CORS standard

Le webhook DB doit être configuré manuellement par l'utilisateur dans le dashboard Supabase (Database → Webhooks). Je fournirai l'URL et les étapes.

## 4. UI client — `/campaigns`

Nouveau hook `useCampaignReports` (fetch + realtime optionnel).

Nouvelle section "Rapport de campagne" insérée **au-dessus** de la liste des campagnes, visible uniquement si au moins un rapport existe (sinon rien affiché, pas d'empty state).

Pour chaque rapport, une carte avec :
- Icône `FileText` + badge vert "Rapport disponible"
- Titre : `campaign_name`
- Date : "Disponible depuis le JJ/MM/YYYY" (format FR via `date-fns` locale fr)
- Boutons :
  - **Voir le rapport** → modal fullscreen (`Dialog` shadcn) avec `<iframe src={file_url}>` pour HTML, ou viewer PDF (iframe fonctionne aussi pour PDF dans la plupart des navigateurs)
  - **Télécharger** → `<a href={file_url} download>`

Traductions FR/EN ajoutées dans `src/i18n/locales/{fr,en}.json` sous `campaigns.report.*`.

## 5. UI admin — `/admin/campaigns`

Ajout d'un bloc "Envoyer un rapport de campagne" en haut de la page existante :

- `Select` utilisateur cible : liste depuis `profiles` (`contact_name` + `domain_name`), recherche incluse
- Input texte : nom de campagne
- Input file : accepte `.html,.pdf` uniquement, validation côté client (taille max raisonnable, ex 25 Mo)
- Bouton "Envoyer le rapport"

Workflow soumission :
1. Upload dans `campaign-reports` au path `{user_id}/{Date.now()}-{filename}`
2. `getPublicUrl` pour obtenir l'URL
3. `INSERT` dans `campaign_reports` (déclenche le webhook → email automatique)
4. Toast : "Rapport envoyé, le client sera notifié par email"
5. Reset du formulaire

## Détails techniques

- Bucket public en lecture : si le workspace bloque les buckets publics, le bucket sera créé puis l'utilisateur devra autoriser dans Settings → Privacy.
- L'app utilise `profiles.contact_name` (pas `first_name`/`last_name`). Le code Edge Function et le Select admin sont adaptés.
- Le champ `campaigns_remaining` et la table `campaigns` existante ne sont pas modifiés — `campaign_reports` est une table séparée et autonome (l'admin saisit librement le `campaign_name`, pas de FK vers `campaigns`).
- i18n : nouvelles clés `campaigns.report.title`, `availableSince`, `view`, `download`, `badge`, et `adminCampaigns.upload.*`.

## Action manuelle requise

Après déploiement, l'utilisateur devra créer le Database Webhook dans le dashboard Supabase :
- Table : `campaign_reports`, événement : `INSERT`
- URL : `https://dmgafmigqfycyaopdviw.supabase.co/functions/v1/notify-campaign-report`
- Headers : `Authorization: Bearer <SUPABASE_ANON_KEY>` (ou laissé vide car `verify_jwt = false`)

Je fournirai un lien direct vers la page Webhooks à la fin.
