## Objectif

Aligner le compteur « Prospects » sur le nombre de contacts qualifiés (table `campaign_interested_contacts`) au lieu du nombre de leads, et nettoyer le détail de la campagne.

## Changements

1. **`src/pages/Campaigns.tsx`** — dans `fetchCampaigns()`, remplacer le `count` sur `leads` par un `count` sur `campaign_interested_contacts` filtré par `campaign_id`. La colonne « Prospects » de la liste affichera donc le même nombre que les « Prospects qualifiés » (ex. 17).

2. **`src/pages/CampaignDetail.tsx`** :
   - Dans `fetchCampaign()`, remplacer le `count` sur `leads` par un `count` sur `campaign_interested_contacts`. La carte « Statistiques › Prospects » affichera 17 au lieu de 0.
   - Supprimer le bouton « Voir les prospects » dans la carte Statistiques (ainsi que le bloc `pt-4 space-y-2` qui ne contient plus rien).

## Hors périmètre

- Aucune modification de base de données, de RLS, ni de la section CRM / Prospects.
- Les autres KPIs (ouvertures, clics, réponses) restent inchangés.
