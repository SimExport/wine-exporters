## Objectif

Supprimer le bouton œil (visible/invisible) sur chaque cuvée dans Profil > Vins. Toutes les cuvées resteront toujours visibles partout (profil + sélection campagne).

## Changements

### `src/components/profile/WineManagement.tsx`
- Retirer le bouton `Eye/EyeOff` (ligne 546-548) dans la colonne Actions du tableau
- Retirer la classe `opacity-50` sur la ligne (ligne 520) — toutes les cuvées s'affichent en plein
- Retirer la fonction `handleToggleActive` (devenue inutile)
- Retirer les imports `Eye, EyeOff` de lucide-react
- Conserver le champ `is_active` en base (forcé à `true` à la création, ligne 125) — pas de migration nécessaire

### `src/pages/CreateCampaign.tsx`
- Ligne 110 : retirer `.eq('is_active', true)` du chargement des vins, pour que toutes les cuvées remontent dans le sélecteur de campagne, même les anciennes éventuellement marquées inactives.

## Hors scope
- Pas de suppression de la colonne `is_active` en base (inutile, ne casse rien).
- Aucune autre modification UX.
