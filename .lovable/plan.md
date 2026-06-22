## Objectif
Permettre de modifier (et supprimer) une note interne déjà ajoutée sur la fiche prospect, en cas de faute de frappe ou d'erreur.

## Changements

### `src/pages/ProspectDetail.tsx`
- Ajouter un état local `editingNoteId` + `editingBody` pour suivre la note en cours d'édition.
- Dans le rendu de chaque note (ligne ~1206) :
  - Afficher au survol deux petits boutons icône en haut à droite de la carte : « Éditer » (icône Pencil) et « Supprimer » (icône Trash).
  - Si la note est en mode édition : remplacer le texte par un `<Textarea>` pré-rempli + boutons « Enregistrer » / « Annuler ».
- Ajouter deux handlers :
  - `handleUpdateNote(noteId)` : `UPDATE prospect_notes SET body = ... WHERE id = ...`, puis recharge les notes et toast succès.
  - `handleDeleteNote(noteId)` : confirmation via `AlertDialog` (ou `confirm` simple), `DELETE FROM prospect_notes WHERE id = ...`, puis recharge.
- Indiquer « (modifié) » à côté de la date si `updated_at > created_at` (si la colonne existe ; sinon on s'en passe).

### Traductions
- `src/i18n/locales/fr.json` & `en.json` : ajouter sous `prospectDetail.notes` :
  - `editBtn` (Modifier / Edit)
  - `deleteBtn` (Supprimer / Delete)
  - `saveBtn` (Enregistrer / Save)
  - `cancelBtn` (Annuler / Cancel)
  - `deleteConfirm` (« Supprimer cette note ? » / "Delete this note?")
  - toasts `noteUpdated`, `noteDeleted`

### Base de données
Aucune migration nécessaire : les policies RLS UPDATE/DELETE existantes sur `prospect_notes` (3 policies déjà en place) couvrent normalement le owner. À vérifier en lecture seule au moment de l'implémentation ; si une policy UPDATE/DELETE manque, ajouter une migration `USING (user_id = auth.uid())`.

## Hors scope
- Édition des notes ailleurs que sur la fiche prospect (les notes campagnes etc. ne sont pas concernées).
- Historique des modifications.
