## Problème

Dans la BDD, les contacts US sont sous deux pays distincts : `United States` (1407 contacts) et `USA` (0 contacts). Les deux s'affichent comme "États-Unis" dans le dropdown (doublon invisible). Selon celui sélectionné, soit la liste d'États est vide (USA = 0 ligne), soit elle est partielle (cap PostgREST 1000 sur 1407, et filtre "seulement les états réellement présents en BDD").

## Correctif

### 1. `src/pages/SourcingRequests.tsx`
Lors de la construction de `countryOptions`, regrouper les variantes DB d'un même pays via les alias définis dans `COUNTRIES` (`country-data.ts`). "United States" + "USA" → une seule entrée canonique, avec `variants = ["United States", "USA"]` envoyé à `StatesMultiSelect` et à l'edge function. Bénéfice secondaire : même comportement pour tout pays ayant plusieurs orthographes en base.

### 2. `src/components/sourcing/StatesMultiSelect.tsx`
Supprimer la requête `buyer_contacts` et afficher directement la liste canonique complète `US_STATES` (50 États + DC). Plus de spinner, plus de "Aucun État disponible pour ce marché". La normalisation côté edge function (`expandUsStateVariants`) gère déjà l'agrégation des sous-régions (counties, townships) au lancement de la recherche.

### 3. Backend : aucun changement
`process-sourcing-request` reçoit déjà toutes les variantes pays via `variants`, et l'expansion des États US est déjà en place.

## Résultat
- Un seul item "États-Unis" dans le dropdown marché.
- Les 50 États + DC immédiatement sélectionnables.
- La recherche agrège bien tous les counties/townships du/des État(s) choisi(s).
