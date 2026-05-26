## Problème
Dans la table Admin > Campagnes, la colonne "Marchés" tronque l'affichage à 3 badges maximum et affiche `+N` sans possibilité d'interaction. L'administrateur ne peut donc pas connaître l'ensemble des marchés choisis par le client.

## Solution
Transformer le badge `+N` en élément interactif qui révèle la liste complète des marchés restants.

### Implémentation
1. **Modifier `getMarketsBadges`** dans `src/pages/AdminCampaigns.tsx` :
   - Garder l'affichage compact des 3 premiers marchés dans la cellule du tableau.
   - Remplacer le badge inerte `+{remaining}` par un élément déclencheur de `Popover` (composant shadcn/ui déjà disponible dans le projet).
   - Le Popover affichera la liste complète des marchés restants sous forme de badges, avec le libellé "Marchés sélectionnés".

2. **Traductions** :
   - Ajouter la clé `adminCampaigns.table.allMarkets` dans `fr.json` et `en.json` avec la valeur "Marchés sélectionnés" / "Selected markets".

### Aperçu du résultat
- La colonne Marchés reste compacte dans le tableau.
- Le badge `+12` devient cliquable.
- Au clic, un petit panneau s'ouvre avec les 12 marchés restants listés en badges.