# Rappels et notifications : affichage adaptatif

## Problème constaté

Deux panneaux flottants ont une largeur fixe (`w-80`) et aucune contrainte de hauteur liée à l'écran :

- **Cloche de notifications** (bas de la barre latérale) : le panneau s'ouvre vers la droite, ancré en bas. Sur un petit écran ou une fenêtre courte, il dépasse et la liste est coupée.
- **Popover de rappel** (icône cloche sur les cartes du pipeline et dans la liste des prospects) : il contient un calendrier complet + une zone de note + les boutons. Ouvert depuis une carte située en bas ou à droite du Kanban, le bouton « Enregistrer » sort de l'écran (visible sur la capture fournie).

## Ce qui va changer

### Sur mobile et petits écrans (< 640 px)
Les deux panneaux deviennent des feuilles glissantes depuis le bas de l'écran, pleine largeur, contenu scrollable et boutons d'action toujours visibles en bas. Plus rien n'est coupé.

### Sur desktop
- Le panneau de notifications s'ouvre au-dessus de la cloche, avec une hauteur maximale calculée sur la hauteur réelle de la fenêtre (au lieu d'une valeur fixe) et une liste scrollable. Largeur adaptative qui ne dépasse jamais la fenêtre.
- Le popover de rappel reçoit la même contrainte : calendrier et note dans une zone scrollable, barre d'actions (« Enregistrer » / supprimer) collée en bas du panneau, donc toujours atteignable. Calendrier en taille compacte pour réduire la hauteur.
- Ajustement du positionnement pour que les panneaux se repositionnent automatiquement près des bords de la fenêtre.

Aucun changement de logique : mêmes rappels, mêmes notifications, mêmes données.

## Détails techniques

- `src/components/AppSidebar.tsx` : contenu du panneau notifications extrait dans un sous-composant, rendu dans un `Popover` (>= sm) ou un `Drawer` (< sm) via `useIsMobile`. `PopoverContent` : `side="top" align="start"`, `collisionPadding={12}`, `w-[min(20rem,calc(100vw-2rem))]`, liste en `max-h-[min(60vh,24rem)] overflow-y-auto`.
- `src/components/ReminderPopover.tsx` : même bascule `Popover` / `Drawer`. Contenu en flex-col avec zone scrollable (`max-h-[70vh]`) et footer d'actions non scrollable, plus `collisionPadding`.
- Réutilisation du hook existant `src/hooks/use-mobile.tsx` et du `Drawer` déjà présent dans `src/components/ui/`.
- Vérification finale par captures Playwright en 375x667 et 1280x720 sur `/pipeline?view=kanban`.