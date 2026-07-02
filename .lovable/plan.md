## Retirer la carte "Formulaire d'intérêt public" de la page campagne

Supprimer entièrement le bloc admin-only ajouté dans `src/pages/CampaignDetail.tsx` (carte "Formulaire d'intérêt public" avec URL + boutons Copier/Ouvrir) ainsi que les imports devenus inutiles (`useRole`, `Copy`, `ExternalLink` s'ils ne servent plus ailleurs dans le fichier).

Le lien public reste accessible aux admins depuis la liste `/admin/campaigns` (boutons "Formulaire d'intérêt" + copier déjà en place).

Aucun autre changement : ni la Edge Function, ni la table, ni les traductions, ni la route publique.
