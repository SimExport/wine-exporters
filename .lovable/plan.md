## Problème

Dans la modale "Recherche sur-mesure" (`/recherches`), le `Select` shadcn des pays n'affiche qu'une partie de la liste (Albanie → Autriche). Le `SelectContent` n'a pas de hauteur max ni de scroll interne explicite, et imbriqué dans un `Dialog` la liste se retrouve tronquée par le viewport sans pouvoir défiler vers le bas.

## Correctif (UI seulement)

Fichier : `src/pages/SourcingRequests.tsx`

Sur le `<SelectContent>` du sélecteur de marché (lignes 255-268) :

- Ajouter `className="max-h-[280px] overflow-y-auto"` pour forcer une hauteur bornée avec scroll vertical interne, indépendamment du conteneur Dialog.
- Garder la `Viewport` Radix existante et le `position="popper"` par défaut (rien d'autre à changer).

Aucune modification du `value` (toujours `c.canonical`, valeur brute BDD), aucune modification de l'Edge Function, aucun changement de logique métier.

## Vérification

- Ouvrir la modale, scroller jusqu'à "Vietnam"/"Royaume-Uni" et confirmer que tous les pays de `countryOptions` sont atteignables.
- Sélectionner un pays "tardif" dans l'alphabet (ex. Slovénie) et vérifier que la valeur envoyée à l'Edge Function reste la valeur brute BDD.
