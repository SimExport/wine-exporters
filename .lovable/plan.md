## Objectif

Quand l'admin clique **"Marquer terminée"** sur une campagne, envoyer automatiquement un email Resend au user propriétaire pour l'informer que sa campagne est terminée et que les résultats/prospects qualifiés sont disponibles dans son espace.

## Implémentation

### 1. Nouvelle Edge Function `notify-campaign-completed`

Fichier : `supabase/functions/notify-campaign-completed/index.ts` — cloné et adapté depuis `notify-campaign-validated`.

- Input : `{ campaignId: string }`
- Fetch campagne (id, name, user_id) + email user + `user_settings.ui_language` pour FR/EN
- Compte les prospects qualifiés (`campaign_interested_contacts` + `leads where source='click'`) pour les afficher en teaser dans le mail
- Envoi Resend :
  - **From** : `WineExporters <notifications@exportvins.fr>` (même que les autres notifs)
  - **BCC** : `simon@exportvins.fr`
  - **Sujet FR** : `🎉 Votre campagne "{name}" est terminée — les résultats sont disponibles`
  - **Sujet EN** : `🎉 Your campaign "{name}" is complete — results are available`
  - **Corps** : header WineExporters bordeaux, message "Votre campagne est terminée", ligne teaser "{N} prospects qualifiés + {M} cliqueurs intéressés" (si > 0), CTA bouton "Voir mes résultats" → `https://wine-exporters.com/campaigns/{id}`
- Log dans `campaign_email_logs` avec `event_type: 'campaign_completed'`
- CORS et gestion d'erreur identiques à `notify-campaign-validated`

### 2. Appel depuis l'admin

Dans `src/pages/AdminCampaigns.tsx`, fonction `markCampaignCompleted` :
- Après l'`UPDATE status='results'` réussi, `supabase.functions.invoke('notify-campaign-completed', { body: { campaignId } })`
- L'erreur d'envoi email ne fait pas échouer l'opération (juste un toast d'avertissement) — la campagne reste marquée terminée

## Fichiers modifiés

- `supabase/functions/notify-campaign-completed/index.ts` (nouveau)
- `src/pages/AdminCampaigns.tsx` (appel invoke)

## Hors périmètre

- Pas de changement de schéma DB
- Pas de renvoi manuel de l'email depuis l'admin (le mail part une seule fois lors du clic)
- Pas de modification des autres fonctions notify existantes
