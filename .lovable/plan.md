# Colonnes personnalisables dans la vue Liste du Pipeline

## Problème
Dans la vue Liste (`/pipeline?view=list` → `src/pages/Prospects.tsx`), les notes internes (dernière note ajoutée à un prospect) ne s'affichent nulle part. Impossible aussi de choisir quelles colonnes afficher — contrairement à la vue Kanban qui a déjà un bouton "Personnaliser" permettant de cocher/décocher les champs affichés sur chaque carte.

## Objectif
Reproduire, dans la vue Liste, la même expérience que le "Personnaliser" du Kanban : un menu qui permet à l'utilisateur de choisir les colonnes visibles, dont une nouvelle colonne **Dernière note** (note interne la plus récente du prospect).

## Changements

### 1. `src/pages/Prospects.tsx`
- Ajouter un bouton **Personnaliser** dans le header de la vue (aligné à droite, même style/placement que dans `Pipeline.tsx`), avec `DropdownMenu` + `Checkbox` par colonne.
- Définir la liste des colonnes disponibles :
  `dateAdded, campaign, company, contact, email, phone, country, actions, status, tag, reminder, lastUpdate, lastNote` (nouvelle).
- Colonnes visibles par défaut = celles déjà affichées aujourd'hui (toutes sauf `lastNote`), pour ne rien changer pour les utilisateurs existants.
- Persister la sélection dans `localStorage` sous la clé `prospects-list-columns:{user.id}` (même pattern que Kanban).
- Rendre conditionnellement chaque `TableHead` et `TableCell` selon `visibleColumns.has(col)`. La colonne "actions rapides" (bouton Ouvrir) reste toujours visible.

### 2. Nouvelle colonne "Dernière note"
- Étendre le chargement des prospects (fonction `loadData` autour des lignes 166-260) pour récupérer la dernière `prospect_notes.content` par lead, exactement comme le fait déjà `Pipeline.tsx` (requête `prospect_notes` puis map `lastNoteByLead[l.id]`).
- Ajouter `last_note?: string | null` sur le type Prospect local.
- Affichage dans la cellule : texte tronqué sur 2 lignes (`line-clamp-2`), en `text-xs text-muted-foreground`, tooltip natif via `title` pour le contenu complet. Fallback `—` si absent.

### 3. i18n
Ajouter dans `src/i18n/locales/fr.json` et `en.json` :
- `prospects.table.lastNote` = "Dernière note" / "Last note"
- `prospects.customize.button` / `prospects.customize.title` / `prospects.customize.columns.<col>` pour chaque colonne (réutiliser les libellés existants de `prospects.table.*` quand pertinent).

## Hors périmètre
- Pas de réorganisation (drag & drop) des colonnes — juste show/hide.
- Pas de modification de la vue Kanban.
- Pas de nouvelle table SQL ni de RLS : `prospect_notes` est déjà utilisé.
- Pas de changement des filtres, pagination ou tri existants.

## Détails techniques
- Réutiliser les composants shadcn déjà présents (`DropdownMenu`, `DropdownMenuItem`, `Checkbox`, icône `Eye` de lucide-react).
- Le `TableRow` d'en-tête et de contenu doivent avoir le même nombre de `<TableHead>` / `<TableCell>` — utiliser des fragments conditionnels `{visible.has('email') && <TableCell>…</TableCell>}` symétriques dans header et body.
- La requête `prospect_notes` doit se limiter aux `lead_id` de la page courante (comme dans `Pipeline.tsx`) pour éviter de charger tout l'historique.
