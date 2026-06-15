# Pipeline personnalisable + changement de statut depuis la fiche prospect

Périmètre strict : page `/pipeline`, page `/prospects/:id`, et nouvelle table `pipeline_stages`. Aucune autre page (Prospects liste, CRM, Campagnes, Admin…) n'est modifiée. La colonne existante `leads.prospect_status` reste en place pour compatibilité ; on ajoute une nouvelle référence `stage_id` utilisée uniquement par les vues `/pipeline` et `/prospects/:id`.

## 1. Base de données

Nouvelle table `public.pipeline_stages` :
- `id uuid pk`
- `user_id uuid` (référence `auth.users`, `on delete cascade`, `not null`)
- `name text not null`
- `position integer not null default 0`
- `color text` (optionnel, non utilisé pour l'instant côté UI mais conservé pour évolution)
- `created_at timestamptz default now()`

GRANTs : `select/insert/update/delete` pour `authenticated`, `all` pour `service_role`. Pas d'accès `anon`.

RLS activée + policy unique « Users manage their own stages » `for all` avec `auth.uid() = user_id`.

Sur `public.leads` : ajout d'une colonne `stage_id uuid` (nullable, `references pipeline_stages(id) on delete set null`) + index sur `stage_id`. La colonne `prospect_status` n'est pas supprimée (utilisée ailleurs hors périmètre).

Pas de seed via migration (les stages dépendent de `auth.uid()`). Le seed est effectué côté client au premier chargement (voir §2).

## 2. Page `/pipeline`

### Chargement
- Au montage : charger `pipeline_stages` filtrés par `user_id`, triés par `position`.
- Si aucune ligne : insérer en batch les 8 stages par défaut dans l'ordre demandé :
  1. À classer
  2. Échantillons à envoyer
  3. Échantillons envoyés
  4. Échantillons réceptionnés
  5. Échantillons dégustés
  6. Négociation
  7. Commande
  8. Archivé

  Puis migrer une fois les `leads` existants de l'utilisateur : map `prospect_status` → stage seedé correspondant et écrire `stage_id`. Cette migration ne tourne qu'au moment du seed initial (quand aucun stage n'existait), pour ne pas écraser les choix manuels ultérieurs.

- Charger les prospects via la requête existante (filtre `campaigns.user_id` + `archived_at is null`) en sélectionnant aussi `stage_id`.

### Rendu du Kanban
- Les colonnes proviennent dynamiquement de l'état `stages` (ordre `position`).
- Regroupement des prospects par `stage_id`. Les prospects avec `stage_id` null tombent dans la première colonne (« À classer ») visuellement, mais ne sont pas réécrits en base tant que l'utilisateur ne les déplace pas.
- Le drag-and-drop met à jour `leads.stage_id` (au lieu de `prospect_status`) + `last_activity_at`.

### Bouton « Gérer les colonnes »
- Bouton secondaire (`variant="outline"`, `size="sm"`) à côté de « Ajouter un prospect » en haut à droite.
- Ouvre un `Dialog` listant les stages :
  - Poignée de drag (icône `GripVertical`) pour réordonner. Au drop, recalcul des `position` (0..n) et `update` en batch.
  - Champ texte inline pour renommer (sauvegarde au blur ou Enter).
  - Bouton suppression : avant `delete`, vérifier `count` de prospects ayant ce `stage_id`. Si > 0, toast d'erreur « Cette colonne contient des prospects. Déplacez-les d'abord. ». Sinon `delete`.
  - Bloc en bas : input + bouton « Ajouter » qui insère une nouvelle stage avec `position = max(position)+1`.
- Après chaque opération réussie, rafraîchir l'état local des stages (et recharger les colonnes du Kanban).

### Drag-and-drop des stages
- Utilisation de l'API HTML5 native déjà employée pour les cartes prospects (pas de nouvelle dépendance).

## 3. Page `/prospects/:id`

- Charger `pipeline_stages` de l'utilisateur (triés par position) au montage.
- Remplacer le `Badge` actuel affichant `t(\`crm.statuses.\${prospect.prospect_status}\`)` par un `Select` shadcn :
  - Options = stages utilisateur.
  - Valeur courante = `prospect.stage_id` ; si null, sélectionner visuellement la première stage sans écrire en base.
  - Au changement : optimistic update local + `update leads set stage_id = ?, last_activity_at = now() where id = ?`. Toast succès « Statut mis à jour ». En cas d'erreur, rollback + toast destructif.
- Le reste de la page (édition, notes, samples, archive/delete) reste inchangé. La logique `handleUpdateStatus` existante basée sur `prospect_status` (won/lost validations) n'est pas appelée par ce nouveau select et reste en place pour les autres flux non touchés.

## 4. i18n

Ajout des clés FR/EN sous `pipeline.manageStages.*` :
- `button` : « Gérer les colonnes » / « Manage columns »
- `title`, `addPlaceholder`, `add`, `rename`, `delete`, `empty`
- `errors.notEmpty` : « Cette colonne contient des prospects. Déplacez-les d'abord. »
- `toasts.created/renamed/reordered/deleted` (succès/erreur)

Et sous `prospectDetail.stageSelect.*` :
- `placeholder` : « Choisir un statut »
- `updated` : « Statut mis à jour »

Les noms des 8 stages par défaut sont insérés tels quels en base (français) — non traduits, car ce sont des données utilisateur modifiables.

## 5. Détails techniques

- Types Supabase : régénérés automatiquement après migration ; utiliser `as any` ponctuellement si besoin avant régénération.
- Aucun nouvel item de navigation, aucune modification de `App.tsx`, `Prospects.tsx`, `CRM.tsx`, `Pipeline` colonnes hardcodées (`PIPELINE_STATUS_KEYS`) supprimées du fichier `Pipeline.tsx` uniquement.
- Pas de Realtime, pas d'edge function, pas de nouvelle dépendance npm.

## Hors périmètre

- Suppression de la colonne `leads.prospect_status` (gardée pour les autres pages).
- Toute modification visuelle sur `/prospects` (liste), `/campaigns`, `/importateurs`, `/recherches-sur-mesure`, `/opportunites`, admin.
- Couleur personnalisée par colonne (champ `color` créé mais non exposé UI).
