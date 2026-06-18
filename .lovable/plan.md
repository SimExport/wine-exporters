## Objectif

Permettre, dans la section « Échantillons demandés » de la fiche prospect, l'édition et la suppression de chaque échantillon déjà ajouté.

## Périmètre

Modifications uniquement dans `src/pages/ProspectDetail.tsx`, dans la section Samples (état/handlers liés + bloc JSX `{/* Samples */}`). Pas de changement de schéma, ni d'autres pages/composants. Ajout de clés i18n dans `fr.json` / `en.json` uniquement sous `prospectDetail.samples.*`.

## Détails

### État

Réutiliser le même `Dialog` que l'ajout en passant en mode édition :
- `editingSampleId: string | null` — id de l'échantillon en cours d'édition (null = mode ajout).
- `deletingSample: SampleItem | null` — échantillon ciblé par la confirmation de suppression.

### Pré-remplissage à l'édition

Sur chaque ligne d'échantillon, deux boutons icônes (`Edit`, `Trash2`) :
- Edit : déduit le `wine_id` à utiliser dans le `Select` :
  - Si `item.wine_id` est non-null → tel quel.
  - Sinon (cuvée du profil), retrouver l'option `cuvee-…` correspondante en matchant `wines.find(w => w.id.startsWith('cuvee-') && w.name === item.wines?.name)`. Si introuvable, laisser vide.
- Pré-remplit `newSample` avec `{ wine_id, quantity: item.quantity, comment: cleanComment }` puis `setEditingSampleId(item.id)` et `setShowAddSample(true)`.
- `cleanComment` : si le commentaire commence par le préfixe cuvée (`prospectDetail.samples.cuveePrefix`), on retire ce préfixe et le séparateur ` - ` pour ne ré-afficher que la note utilisateur (afin de ne pas dupliquer le préfixe à la sauvegarde, qui le rajoute automatiquement pour les cuvées). À l'enregistrement, la logique cuvée existante régénère le préfixe.

### Enregistrement unifié

Renommer la cible du bouton de la modal en `handleSaveSample` :
- Si `editingSampleId === null` → comportement actuel `INSERT`.
- Sinon → `UPDATE` sur `sample_items` (`wine_id`, `quantity`, `comment` avec la même logique cuvée/préfixe) puis remplacement de l'élément dans `sampleItems` (en conservant `wines.name` reconstitué pour les cuvées). Toast `sampleUpdated` (nouvelle clé i18n).

À la fermeture / annulation de la modal, reset `editingSampleId = null` et `newSample` aux valeurs par défaut. Le titre de la modal et le label du bouton principal changent selon le mode (`dialogTitle` / `dialogEditTitle`, `add` / `save`).

### Suppression

Trash icon → ouvre un `AlertDialog` (déjà importé dans le fichier) de confirmation :
- Titre + description i18n (`samples.deleteConfirm.title` / `.description`).
- Action destructive : `DELETE FROM sample_items WHERE id = deletingSample.id`, mise à jour optimiste `setSampleItems(prev => prev.filter(...))`, toast succès, fermeture.

L'AlertDialog est rendu localement à l'intérieur de la card Samples pour rester confiné au périmètre demandé.

### i18n (nouvelles clés sous `prospectDetail.samples`)

- `dialogEditTitle` — « Modifier un échantillon » / « Edit sample »
- `save` — « Enregistrer » / « Save »
- `edit` — « Modifier » / « Edit » (aria-label)
- `delete` — « Supprimer » / « Delete » (aria-label)
- `deleteConfirm.title` — « Supprimer cet échantillon ? » / « Delete this sample? »
- `deleteConfirm.description` — « Cette action est irréversible. » / « This cannot be undone. »
- `toasts.sampleUpdated.title` / `.description`
- `toasts.sampleDeleted.title` / `.description`

## Hors périmètre

- Pas de modification de la table `sample_items` ou des RLS.
- Pas de modification d'autres sections de la fiche prospect.
- Pas de changement de comportement du bouton « Marquer envoyés ».