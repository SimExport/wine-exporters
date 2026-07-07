## Bug

Sur `/admin/campaigns`, le drawer "Ajouter un prospect à ..." se coupe : après le champ "Lien réponse Tally", la section Échantillons et les boutons Annuler/Enregistrer ne s'affichent pas (grand espace blanc, impossible de scroller jusqu'en bas).

## Cause

Le composant `Drawer` (vaul) est utilisé avec `max-h-[90vh] overflow-y-auto` posé directement sur `DrawerContent`. Vaul gère lui-même la hauteur/animation via transform, et cet `overflow` sur le conteneur racine ne scrolle pas correctement : le contenu qui dépasse la hauteur ancrée est masqué au lieu d'être scrollable.

Le `Sheet` juste en dessous (réponses formulaire) fonctionne bien parce qu'il utilise `SheetContent` en side-panel avec `overflow-y-auto` — pattern éprouvé dans le reste de l'app (drawer prospects CRM, etc.).

## Fix

Remplacer le `Drawer` "Ajouter un prospect" par un `Sheet` latéral, aligné sur le pattern déjà utilisé dans le même fichier pour les réponses :

- `Drawer` / `DrawerContent` / `DrawerHeader` / `DrawerTitle` → `Sheet` / `SheetContent` / `SheetHeader` / `SheetTitle`
- `SheetContent` avec `side="right"`, `className="w-full sm:max-w-3xl overflow-y-auto"` pour laisser toute la place aux 2 colonnes du formulaire.
- Ajouter l'import `Sheet, SheetContent, SheetHeader, SheetTitle` depuis `@/components/ui/sheet` et retirer les imports `Drawer*` s'ils ne servent plus.
- Conserver l'état `drawerOpen` / `setDrawerOpen` (juste renommer côté props : `open` / `onOpenChange`).
- Aucun changement à la logique `handleProspectSubmit`, `prospectForm`, `sampleItems`, ni au backend.

## Fichiers modifiés

- `src/pages/AdminCampaigns.tsx` uniquement.

## Hors périmètre

- Aucune modification des Edge Functions, du schéma DB, ni des autres drawers/pages.
- Pas de refonte visuelle du formulaire (ordre des champs, i18n, validation inchangés).