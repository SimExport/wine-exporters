## Cause racine

Il y a **deux entrées** pour lancer une "Recherche sur-mesure" :

1. **Page `/recherches`** (`SourcingRequests.tsx`) → envoie le nom **anglais canonique** (`englishName`) → fonctionne ✅
2. **Page `/importateurs`** (`Importers.tsx`, ligne 119) → envoie le nom **français** (`c.name`) → ne matche jamais `buyer_contacts.country` qui stocke uniquement en anglais → erreur "Aucun contact disponible pour ce marché" ❌

Les 3 recherches en erreur de ta capture (Thaïlande / Suède / Allemagne) ont toutes été lancées depuis la page Importateurs.

Vérifié en BDD :
- `Germany` = 2 044 contacts, `Sweden` = 502, `Thailand` = 221
- 0 contact avec libellé FR (`Thaïlande`, `Suède`, `Allemagne`)

## Ce qui change

### 1. `src/pages/Importers.tsx`
Remplacer le nom français par le nom anglais à l'insertion, comme le fait déjà `SourcingRequests.tsx` :

```ts
target_market:
  COUNTRY_LIST.find(c => c.code === sourcingMarket)?.englishName ||
  COUNTRY_LIST.find(c => c.code === sourcingMarket)?.name ||
  sourcingMarket,
```

Idem pour le `marketName` envoyé à `notify-sourcing-submission` (cohérence dans les emails admin).

### 2. `supabase/functions/process-sourcing-request/country-variants.ts` — filet de sécurité
Ajouter un mapping FR→EN minimal embarqué dans la fonction. Si `resolveCountryVariants` ne trouve aucune ligne avec le nom tel quel, retenter avec la traduction anglaise. Cela protège :
- les futures recherches si une autre page envoyait par erreur un libellé FR
- les anciennes lignes `sourcing_requests` déjà créées (Thaïlande, Suède, Allemagne) si l'admin les relance

Le mapping sera dérivé de `country-data.ts` (copié dans `supabase/functions/process-sourcing-request/` puisque les edge functions ne peuvent pas importer depuis `src/`). Pour rester léger, on n'embarque qu'un objet `{ "thaïlande": "Thailand", "suède": "Sweden", "allemagne": "Germany", … }` regénéré à partir de la liste FR/EN existante.

Mettre à jour `country-variants.test.ts` avec un test FR→EN.

### 3. Backfill manuel des 3 lignes en erreur
Migration SQL one-shot :
```sql
UPDATE sourcing_requests SET target_market = 'Thailand',
  status = 'pending', error_message = NULL
  WHERE target_market = 'Thaïlande' AND status = 'pending';
-- idem Suède→Sweden, Allemagne→Germany
```
Puis l'admin pourra cliquer "Démarrer" sur ces 3 lignes pour relancer la recherche.

## Hors scope

- Pas de refonte du sélecteur de pays sur Importers (déjà fonctionnel côté UX)
- Pas de modification de `buyer_contacts` (la BDD reste en anglais, c'est la convention)
- Pas d'auto-relance des recherches échouées (l'admin déclenche manuellement)
