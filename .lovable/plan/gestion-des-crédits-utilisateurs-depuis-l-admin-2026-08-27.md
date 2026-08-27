# Gestion des crédits utilisateurs depuis l'admin

## Où les crédits sont utilisés aujourd'hui

Tout passe par la table `user_credits` (3 compteurs) :

| Crédit | Colonne | Bloque quoi |
|---|---|---|
| Campagne | `campaign_credits` | Lancement d'une campagne (page Créer une campagne, badge du Dashboard) |
| Recherche sur-mesure | `search_credits` | Demande de recherche (page Recherches sur-mesure + bloc sourcing de la page Importateurs) |
| Export | `export_credits` | Téléchargement/export des importateurs (remis à 500 chaque mois automatiquement) |

Chaque consommation passe par une fonction serveur (`consume_campaign_credit`, `consume_search_credit`, `consume_export_credits`) : si le compteur remonte, l'utilisateur peut de nouveau agir immédiatement.

Note : `profiles.campaigns_remaining` existe encore mais n'est plus le verrou du lancement de campagne (c'est `campaign_credits`). Il sera affiché en lecture seule pour info, sans être modifié.

## Ce qui sera ajouté

1. **Colonne « Crédits » dans /admin/users** : affichage compact `campagne / recherche / export` pour chaque utilisateur, avec un bouton d'édition.
2. **Fenêtre « Modifier les crédits »** (accessible depuis la liste et depuis la fiche utilisateur `/admin/users/:id`) :
   - valeur actuelle de chaque compteur,
   - boutons rapides « +1 campagne », « +1 recherche », « +100 exports »,
   - champs pour fixer une valeur précise,
   - affichage de la date du prochain reset mensuel,
   - confirmation avec toast et mise à jour immédiate du tableau.
3. **Le reset mensuel classique reste intact** : on ne touche ni à `next_reset_date`, ni à la logique de remise à 500 des exports, ni au webhook Stripe. Un crédit ajouté est simplement consommable dès maintenant.
4. **Prise en compte côté utilisateur sans déconnexion** : la page de l'utilisateur se resynchronise sur ses crédits (rafraîchissement au retour sur l'onglet / à la navigation), donc s'il n'avait plus de campagne dispo, le bouton se réactive.

## Détails techniques

- Migration : fonction `admin_set_user_credits(_user_id uuid, _campaign int, _search int, _export int)` en `SECURITY DEFINER`, qui vérifie `has_role(auth.uid(), 'admin')`, refuse les valeurs négatives, fait un upsert sur `user_credits` (sans modifier `next_reset_date` ni `subscription_start_date`) et retourne la ligne mise à jour. `GRANT EXECUTE` à `authenticated`.
  Raison : `user_credits` n'a aujourd'hui qu'une policy admin en lecture (pas d'UPDATE), donc l'écriture doit passer par cette fonction.
- Nouveau composant `src/components/admin/EditUserCreditsDialog.tsx`.
- `src/pages/AdminUsers.tsx` : ajout de la colonne + chargement des crédits (une requête `user_credits` en plus dans `load()`), mise à jour de l'état local après édition.
- `src/pages/AdminUserProfile.tsx` : bouton « Modifier » dans la carte « Crédits & abonnement » réutilisant le même dialog.
- `src/hooks/useCredits.tsx` : refetch sur `visibilitychange`/focus pour que l'utilisateur voie le crédit rendu sans recharger la page.
- Aucun autre écran, table ou Edge Function modifié.
