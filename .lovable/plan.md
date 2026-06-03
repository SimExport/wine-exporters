# Filtre "Marché ciblé" — états uniquement pour les USA

## Constat

Aujourd'hui, le sélecteur d'états/régions s'affiche pour : USA, Royaume-Uni (4 variantes), Allemagne, Australie, Canada, Chine. La donnée brute `buyer_contacts.state` est bruitée : pour les US elle contient des combinaisons comme `"California, Napa County"`, `"Florida-Dade County"`, `"Illinois, Cook County, Bremen Township"`, etc. Une sélection "California" ne ramène donc qu'une fraction des contacts californiens.

Vérification BDD : seuls **USA, Allemagne, UK** sont concernés par l'affichage actuel + ont effectivement de la donnée `state`. Tout le reste (Australie/Canada/Chine) sera désormais recherché au niveau pays uniquement.

## Changements

### 1. UI — n'afficher le sélecteur que pour les USA
`src/pages/SourcingRequests.tsx`
- Réduire `STATES_REQUIRED_NAMES` à : `united states`, `usa`.
- Allemagne, UK (et toutes les variantes UK) → recherche pays entier, plus de sélection obligatoire.

### 2. UI — sélecteur d'états US "propre" (50 états + DC)
`src/components/sourcing/StatesMultiSelect.tsx`
- Remplacer la liste brute par la liste canonique des **50 états fédéraux + District of Columbia** (constante côté front).
- Charger en parallèle les `state` bruts depuis `buyer_contacts` pour USA, les normaliser (cf. règle ci-dessous), et n'afficher dans le sélecteur que les états canoniques qui ont au moins un contact (avec compteur optionnel).
- Le `value` retourné reste une liste de noms canoniques (ex. `["California","Oregon"]`).

**Règle de normalisation US** (helper partagé) :
1. Prendre la portion avant la première virgule.
2. Retirer un éventuel suffixe ` County` ou ` Country`.
3. Trim + matcher (case-insensitive) contre la liste canonique. Sinon, rejeter (entrée hors-US comme `Caicos Islands, Providenciales`).

### 3. Backend — agrégation des sous-régions au moment de la recherche
`supabase/functions/process-sourcing-request/index.ts` + nouveau helper `us-states.ts` (testable, à côté de `country-variants.ts`).
- Si `states_filter` non vide ET pays = USA :
  - Charger tous les `state` distincts pour les variantes USA.
  - Pour chaque état canonique sélectionné, retenir **toutes** les valeurs brutes dont la normalisation correspond.
  - Remplacer `query.in("state", reqRow.states_filter)` par `query.in("state", expandedVariants)`.
- Pour les autres pays, ignorer `states_filter` (au cas où un ancien `states_filter` traînerait en base) et requêter sur le pays entier.

### 4. i18n
- Ajuster les libellés `sourcing.states.*` pour préciser "États-Unis uniquement" si besoin (placeholder déjà générique, à vérifier FR/EN).

### Hors-scope
- Pas de migration BDD (la donnée brute reste telle quelle).
- Pas de changement sur l'admin sourcing.
- Pas de nettoyage des `states_filter` historiques (gérés défensivement côté edge function).

## Détails techniques

- Le helper de normalisation US est dupliqué côté front (TS) et côté edge (Deno) ; il fait < 20 lignes, on accepte la duplication plutôt que d'introduire un module partagé.
- Test unitaire ajouté dans `supabase/functions/process-sourcing-request/us-states.test.ts` (sur le modèle de `country-variants.test.ts`) pour couvrir : `"California, Napa County"` → `California`, `"Florida-Dade County"` → rejet (pas de match exact), `"District of Columbia"` → `District of Columbia`, etc. On garde `Florida-Dade County` → `Florida` via une règle additionnelle (prendre aussi le préfixe avant `-` si le 1er token matche un état).
