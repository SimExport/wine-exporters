## Objectif

Le bouton "Voir prospects" du tableau admin renvoie actuellement vers `/prospects?campaign=…`, une page côté user à laquelle l'admin ne peut pas accéder sans le compte du client. Le remplacer par une vue admin qui liste **tous les importateurs qualifiés liés à la campagne**, sans quitter l'admin.

## Comportement

Le bouton "Voir prospects" ouvre un **Sheet** (panneau latéral) qui affiche, pour la campagne cliquée :

**Section 1 — Répondants formulaire** (source: `campaign_interested_contacts`)
Colonnes : société, contact, email, pays, score /10, description courte.

**Section 2 — Cliqueurs importés** (source: `leads` where `campaign_id = X and source = 'click'`)
Colonnes : email, marché, score /10 (`source_score`), description (`owner_notes`), date de création.

En-tête du Sheet :
- Nom de la campagne
- 2 compteurs : "Répondants: N" · "Cliqueurs: M"
- Total combiné

État vide par section si aucune donnée.

Aucune action d'édition dans ce Sheet (lecture seule, admin voit ce que le user verrait sur son CRM).

## Fichiers modifiés

- `src/pages/AdminCampaigns.tsx` : le bouton `viewProspects` déclenche l'ouverture du Sheet au lieu d'un `window.open`. Ajout d'un state `qualifiedOpenId` et fetch à l'ouverture.
- `src/components/admin/CampaignQualifiedProspectsSheet.tsx` (nouveau) : composant qui fetch et affiche les deux listes.
- `src/i18n/locales/fr.json` + `en.json` : nouvelles clés `adminCampaigns.qualified.title / respondents / clickers / empty / …`.

## Hors périmètre

- Pas de modification de la table `leads` ni `campaign_interested_contacts`.
- Pas de nouvelle route admin dédiée (un Sheet suffit).
- Pas de bouton d'export / d'action sur les prospects depuis ce Sheet.
