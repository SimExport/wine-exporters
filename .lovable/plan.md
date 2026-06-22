## Objectif

Afficher dans la carte "Statistiques" de la page Campagne (vue utilisateur) trois indicateurs, et permettre à l'admin de saisir manuellement les deux nouveaux dans le drawer d'édition d'une campagne.

## Vue utilisateur — `src/pages/CampaignDetail.tsx`

Dans la carte "Statistiques" (lignes ~414-427), remplacer le bloc actuel par trois lignes empilées :

1. **Prospects qualifiés trouvés** — valeur actuelle `campaign.prospect_count` (renommé uniquement, logique inchangée — toujours basé sur `campaign_interested_contacts`).
2. **Pourcentage d'ouverture** — `campaign.stats_opens` affiché en `%` (ex. `42 %`). Si `null` → `—`.
3. **Nombre de clics sur "intéressé"** — `campaign.stats_clicks`. Si `null` → `—`.

Les champs `stats_opens` et `stats_clicks` sont déjà fetchés dans `fetchCampaign` (table `campaigns`). Aucun changement de requête.

Ajout des clés i18n FR/EN sous `campaigns.detail` :
- `prospectsLabel` : renommer en "Prospects qualifiés trouvés" / "Qualified prospects found"
- `openRateLabel` : "Pourcentage d'ouverture" / "Open rate"
- `interestedClicksLabel` : "Clics sur intéressé" / "Interested clicks"

## Vue admin — `src/pages/AdminCampaigns.tsx`

Dans le drawer d'édition de campagne (zone existante qui gère déjà `selectedCampaign`), ajouter une section "Statistiques" avec deux champs `Input type="number"` :
- **Pourcentage d'ouverture** → `stats_opens` (0-100)
- **Nombre de clics sur intéressé** → `stats_clicks`

Le champ "Prospects qualifiés trouvés" est affiché en lecture seule (valeur calculée automatiquement via `campaign_interested_contacts`).

Bouton "Enregistrer les statistiques" qui fait un `UPDATE campaigns SET stats_opens, stats_clicks WHERE id = selectedCampaign.id`, puis recharge la liste et toast de confirmation.

Ajout des clés i18n FR/EN sous `adminCampaigns` :
- `statsSection` : "Statistiques"
- `openRateField` : "Pourcentage d'ouverture (%)"
- `interestedClicksField` : "Clics sur intéressé"
- `saveStats` : "Enregistrer les statistiques"
- `statsSaved` : "Statistiques mises à jour"

## Hors scope

- Pas de modification de la base de données : `stats_opens`, `stats_clicks`, `stats_replies` existent déjà sur `campaigns`.
- Pas de changement à l'upload CSV existant ni à `CampaignInterestedContactsUpload`.
- Pas de KPI "emails envoyés", "taux de clic", "très intéressés", "qualifiés Tally" pour l'instant — l'utilisateur a précisé en deuxième partie de message qu'il souhaite uniquement les 3 KPIs (prospects qualifiés, % ouverture, clics intéressé) dans la carte Statistiques. À confirmer si on veut quand même ajouter une rangée de cards supplémentaire en haut de page avec les autres KPIs.

## Question avant build

La deuxième partie du message contredit la première (6 KPIs en cards en haut vs 3 valeurs dans la carte Statistiques existante). Le plan ci-dessus suit la **deuxième partie** (plus précise et alignée au screenshot). Confirmer ou demander d'ajouter en plus une rangée de cards en haut avec les 6 KPIs initiaux.