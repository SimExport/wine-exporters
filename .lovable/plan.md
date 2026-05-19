## Objectif

Fusionner les pages **CRM - Liste** (`/prospects`) et **CRM - Kanban** (`/pipeline`) en une seule page **CRM** accessible via `/pipeline`, avec un sélecteur de vue (Kanban / Liste) permettant de basculer instantanément sans changer d'URL.

## Comportement utilisateur

- Une seule entrée **CRM** dans la sidebar (au lieu de "CRM - Liste" + "CRM - Kanban").
- Ouverture par défaut en vue **Kanban**.
- En haut de la page, un toggle `[ Kanban | Liste ]` (icônes `Kanban` / `List`) permet de switcher.
- Le choix est mémorisé dans `localStorage` (`crm-view-mode`) pour que l'utilisateur retrouve sa dernière vue.
- Optionnel : query string `?view=list` pour partager un lien direct vers une vue.
- L'ancienne URL `/prospects` redirige vers `/pipeline` pour ne pas casser les liens existants (sidebar, emails, bookmarks).

## Plan technique

1. **Nouvelle page unifiée `src/pages/CRM.tsx`**
   - Header commun : titre "CRM", description, et `ToggleGroup` (shadcn) avec deux items Kanban / Liste.
   - State `view: 'kanban' | 'list'` initialisé depuis `localStorage` + query string, persistance au changement.
   - Extraction du contenu des deux pages actuelles en deux composants présentationnels :
     - `src/components/crm/KanbanView.tsx` ← corps de `Pipeline.tsx` (board, colonnes par statut, drag & drop).
     - `src/components/crm/ListView.tsx` ← corps de `Prospects.tsx` (table, filtres Hot/Warm/Cold, pagination 10/page, indicateur 15 jours d'inactivité).
   - Les filtres communs (recherche, tags, marché…) restent dans chaque vue pour la première itération — pas de refactor des filtres pour éviter la régression.

2. **Routing (`src/App.tsx`)**
   - Remplacer l'import `Pipeline` et `Prospects` par `CRM`.
   - Route `/pipeline` → `<CRM />`.
   - Route `/prospects` → `<Navigate to="/pipeline" replace />` (conserve `/prospects/:id` → `ProspectDetail` inchangé).

3. **Sidebar (`src/components/AppSidebar.tsx`)**
   - Supprimer les deux entrées `crmList` et `crmKanban`.
   - Ajouter une entrée unique `{ key: "crm", url: "/pipeline", icon: Kanban }`.

4. **i18n (`fr.json` / `en.json`)**
   - Ajouter `sidebar.crm` = "CRM".
   - Ajouter `crm.viewKanban` / `crm.viewList` pour le toggle.
   - Conserver les clés existantes utilisées par les deux vues.

5. **Suppression**
   - Supprimer `src/pages/Pipeline.tsx` et `src/pages/Prospects.tsx` une fois leur contenu déplacé dans les composants `KanbanView` / `ListView`.

## Hors scope

- Pas de refonte des filtres, de la pagination, ou de la logique de drag & drop.
- Pas de modification de `/prospects/:id` (page détail prospect).
- Pas de changement de schéma Supabase.
