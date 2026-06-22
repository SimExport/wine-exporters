## Objectif

Permettre une sélection fine des contacts à exporter sur `/importateurs` via des cases à cocher, avec un mécanisme "tout sélectionner la page" puis "sélectionner les N contacts de la liste entière".

## Page `src/pages/Importers.tsx`

### Nouvel état
- `selectedIds: Set<string>` — ids de `buyer_contacts` cochés (persistant à travers la pagination)
- `selectAllAcrossPages: boolean` — quand `true`, indique que TOUS les contacts du pays sont sélectionnés (pas seulement ceux chargés), pour éviter d'avoir à fetcher 168 ids juste pour cocher
- Reset des deux à chaque changement de `selectedCountry`

### Colonne checkbox dans le tableau
- Nouvelle première colonne avec `<Checkbox>` (shadcn `@/components/ui/checkbox`) dans `TableHead` et chaque `TableRow`
- Header checkbox = "tout cocher sur la page courante" :
  - `checked` quand tous les `contacts.id` de la page sont dans `selectedIds` (ou `selectAllAcrossPages === true`)
  - `indeterminate` quand certains seulement
  - onCheckedChange : ajoute/retire les ids de la page dans `selectedIds` ; si on décoche, désactive aussi `selectAllAcrossPages`
- Row checkbox : toggle l'id du contact. Si on décoche pendant `selectAllAcrossPages`, on bascule en mode "ids explicites" (initialiser `selectedIds` avec tous les ids du pays via fetch d'ids → voir ci-dessous) puis retirer celui décoché.

### Bandeau "sélectionner tous les N contacts"
- Affiché juste au-dessus du tableau quand : tous les contacts de la page sont cochés ET `totalCount > contacts.length` ET `!selectAllAcrossPages`
- Texte : `"Les {{pageCount}} contacts de cette page sont sélectionnés."` + bouton lien `"Sélectionner les {{totalCount}} contacts de la liste"`
- Clic → `setSelectAllAcrossPages(true)` et vide `selectedIds` (inutile de stocker les ids individuellement dans ce mode)
- Quand `selectAllAcrossPages === true`, afficher un bandeau confirmant `"Les {{totalCount}} contacts sont sélectionnés."` + bouton `"Effacer la sélection"`

### Compteur de sélection + bouton télécharger
- Remplacer le bouton existant "Télécharger la liste" par un bouton dont le label devient :
  - `"Télécharger ({{n}})"` quand `n = effectiveSelectionCount > 0`
  - `"Télécharger la liste"` (comportement actuel = tout le pays) quand aucune sélection
- `effectiveSelectionCount` = `selectAllAcrossPages ? totalCount : selectedIds.size`
- Disabled quand `!hasPaidAccess`, `exporting`, ou (sélection > 0 ET `exportCredits <= 0`)

### Logique d'export adaptée
Renommer/étendre `performExport` :
- Si `effectiveSelectionCount > 0` :
  - `limit = effectiveSelectionCount` (1 contact = 1 crédit)
  - Si `effectiveSelectionCount > exportCredits` → ouvrir le `AlertDialog` partiel existant (adapté pour utiliser la sélection comme total)
  - Sinon consommer `effectiveSelectionCount` crédits puis fetch :
    - mode `selectAllAcrossPages` : `select * .in('country', dbAliases).order('company_name').limit(limit)` (identique à l'export pays actuel)
    - mode ids explicites : `select * .in('id', Array.from(selectedIds))` — Supabase tolère jusqu'à plusieurs milliers d'ids dans un `.in()`, on découpe par chunks de 500 si > 500 (sécurité, même si limité par quota)
- Si aucune sélection → comportement actuel (export du pays entier)

### AlertDialog partiel
- Adapter le texte pour distinguer "contacts sélectionnés" vs "contacts du pays" via un paramètre (clé i18n `partialDescriptionSelection`).

### Reset de la sélection
- À chaque changement de `selectedCountry` ou après un export réussi : vider `selectedIds` et `selectAllAcrossPages`.

## i18n (FR/EN) — `src/i18n/locales/*.json` sous `importers.exportCredits`

Ajout des clés :
- `selectAllRow` : "Tout sélectionner sur cette page"
- `pageSelected` : "Les {{count}} contacts de cette page sont sélectionnés."
- `selectAllList` : "Sélectionner les {{total}} contacts de la liste"
- `allSelected` : "Les {{total}} contacts sont sélectionnés."
- `clearSelection` : "Effacer la sélection"
- `downloadWithCount` : "Télécharger ({{count}})"
- `partialDescriptionSelection` : "Vous avez sélectionné {{total}} contacts mais il ne vous reste que {{remaining}} crédits d'export ce mois-ci. Voulez-vous télécharger les {{remaining}} premiers ?"

## Hors scope

- Pas de changement à la base, au hook `useCredits`, à la pagination ou au composant `CountrySelector`.
- Pas de modification d'autres pages.
- Les CSV restent identiques (mêmes 9 colonnes, même nommage de fichier).

## Détails techniques

- Utilisation du composant `@/components/ui/checkbox` (shadcn, déjà installé dans le projet — sinon utiliser un `<input type="checkbox">` natif stylé).
- `Set<string>` géré via `new Set(prev)` pour rester immuable.
- En mode `selectAllAcrossPages`, la décoché ligne-par-ligne reste hors scope (UX simple : on désactive seulement le mode via le bouton "Effacer la sélection") — confirmer si tu veux le toggle individuel possible en mode "tout sélectionné".