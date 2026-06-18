## Plan — Améliorations du pipeline personnalisable

Les deux features principales (colonnes dynamiques + dropdown statut) sont en place. Ces ajouts capitalisent dessus pour rendre le pipeline vraiment exploitable au quotidien, sans toucher aux autres pages.

### 1. Couleur par colonne (champ `color` déjà présent en base)

Dans le dialog **« Gérer les colonnes »** (`StagesManagerDialog.tsx`) :
- Ajouter un petit sélecteur de couleur à côté de chaque stage (palette restreinte de 6–8 teintes cohérentes avec le design system : ardoise, bordeaux, ambre, vert, bleu, violet, gris).
- Sauvegarde immédiate dans `pipeline_stages.color` (update optimiste).
- Pour les 8 stages seedés au premier chargement, attribuer une couleur par défaut (au lieu de `null`).

### 2. Application de la couleur dans l'UI

- **Kanban (`Pipeline.tsx`)** : barre de couleur en haut de chaque colonne + pastille à côté du nom.
- **Fiche prospect (`ProspectDetail.tsx`)** : le `Select` du statut affiche une pastille colorée devant chaque option, et le trigger reprend la couleur du stage courant.

### 3. Compteur de prospects par colonne

- Afficher `({count})` à droite du nom de colonne dans le Kanban.
- Mise à jour en direct lors d'un drag-and-drop.

### 4. Polish drag-and-drop des stages

- Indicateur visuel plus net pendant le drag (ligne d'insertion entre colonnes dans le dialog de gestion).
- Toast confirmation `Ordre mis à jour` après réorganisation.

### Détails techniques

- Aucune nouvelle migration : la colonne `pipeline_stages.color` existe déjà.
- Modifications confinées à :
  - `src/components/pipeline/StagesManagerDialog.tsx`
  - `src/pages/Pipeline.tsx`
  - `src/pages/ProspectDetail.tsx`
  - `src/i18n/locales/{fr,en}.json` (nouvelles clés UI)
- Mise à jour du seed `loadOrSeedStages` pour inclure une couleur par défaut.
- Pas de changement sur `/prospects`, `/campaigns`, `/importateurs`, `/recherches-sur-mesure`, `/opportunites`, ni les pages admin.

### Hors scope

- Pas d'ajout de filtres ni d'export sur le pipeline (à traiter dans un lot suivant si tu le souhaites).
- Pas de stages partagés entre utilisateurs.

Dis-moi si tu veux ajuster le scope (par ex. uniquement les couleurs, ou inclure des filtres) avant que je passe en build.