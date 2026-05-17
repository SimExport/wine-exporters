## Diagnostic

Le bug ne vient probablement pas du rendu du dropdown : la base contient bien 155 pays distincts, mais le composant ne charge les pays avec `supabase.from('buyer_contacts').select('country')` sans pagination. Avec Supabase/PostgREST, une requête côté client sans range retourne seulement les 1000 premières lignes par défaut. Comme les contacts sont vraisemblablement ordonnés de façon stable par pays, ces 1000 premières lignes ne couvrent que les pays de `Albania` à `Austria`, d'où la liste tronquée.

## Plan de correction

1. Remplacer le chargement naïf des pays dans `src/pages/SourcingRequests.tsx` par une récupération paginée de `buyer_contacts.country`.
2. Parcourir les résultats par lots jusqu'à épuisement des lignes, puis construire `countryOptions` à partir de tous les pays reçus.
3. Garder la logique actuelle :
   - `value={c.canonical}` reste la valeur brute BDD envoyée à `sourcing_requests.target_market`.
   - Le texte affiché reste traduit via `translateCountry`.
   - Aucun changement Edge Function ni logique métier.
4. Ignorer correctement les valeurs vides ou composées uniquement d'espaces, pour éviter une option vide en tête de liste.
5. Vérifier que des pays en fin d’alphabet comme `United States`, `Vietnam` ou `Zimbabwe` sont bien présents dans les options après chargement.

## Détail technique

- Ajouter une constante de taille de page, par exemple `const COUNTRY_FETCH_PAGE_SIZE = 1000`.
- Dans le `useEffect`, boucler avec `.range(from, to)` sur `buyer_contacts` jusqu'à recevoir moins que la taille de page.
- Construire les groupes après chaque lot ou à la fin, en conservant les variantes brutes BDD pour les filtres d’États.
- Supprimer/éviter l’option vide actuellement visible dans les données (`country = ''`).