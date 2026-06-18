## Objectifs

1. Importer une adresse plus complète depuis Recherche sur-mesure (rue + complément, ville, code postal, état/région, pays).
2. Afficher un drapeau emoji du pays à côté du contact, sur la fiche prospect et dans les cartes CRM.
3. Afficher de façon visible l'origine "Recherche sur-mesure" + score + pertinence (raison) sur la fiche prospect et dans la carte CRM.

## Périmètre

- `SourcingResultsDialog.tsx` : enrichir l'import (adresse + score + reason + source).
- `src/lib/country-flag.ts` (nouveau) : helper `getCountryFlag(name)` → emoji drapeau via `COUNTRIES.dbAliases / englishName / name` → `isoA2` → emoji (code points régionaux).
- `ProspectDetail.tsx` : drapeau à côté du pays (header + bloc adresse), affichage rue/complément/état déjà géré, et nouveau bloc "Provenance" (badge "Recherche sur-mesure", score /10, raison) visible quand `source = 'sourcing'`.
- `Pipeline.tsx` (cartes CRM) : drapeau devant le pays, et petit badge "Sur-mesure · 8/10" quand `source = 'sourcing'`.
- Migration : ajouter `source_score INT` et `source_relevance TEXT` sur `leads` (les colonnes `source`, `source_ref` existent déjà). Pas d'autre changement de schéma.

## Détails techniques

### 1. Enrichissement adresse à l'import

Dans `addToCrm` (SourcingResultsDialog) : étendre la sélection `buyer_contacts` à `street, address_line2:Address, city, state, postal_code, country, phone, website_url, email, full_address`. Mapping vers `leads` :

- `address_line1` ← `contact.street` (sinon parse simple de `full_address` si `street` vide : première portion avant la première virgule, uniquement si elle ne ressemble pas au code postal/ville).
- `address_line2` ← `contact.state` (région/état, utile US/CA/AU/etc.) si non vide.
- `city` ← `contact.city`.
- `postal_code` ← `contact.postal_code`.
- `country` ← `contact.country ?? marketLabel`.

Si aucun match `buyer_contacts` et `full_address`/`Address` absent : on garde au minimum `country = marketLabel`.

### 2. Provenance / score / pertinence

Champs ajoutés à l'insert `leads` :
- `source` = `'sourcing'`
- `source_ref` = id de la `sourcing_request` (passer une nouvelle prop `requestId: string` au dialog depuis `SourcingRequests.tsx` et `AdminSourcing.tsx`).
- `source_score` = `item.score` (int 1-10).
- `source_relevance` = `item.reason`.

`message_snippet` reste = `item.reason` pour compat ; `owner_notes` inchangé.

### 3. Helper drapeau

```ts
// src/lib/country-flag.ts
export function getCountryFlag(name?: string | null): string {
  if (!name) return '';
  const norm = name.trim().toLowerCase();
  const c = COUNTRIES.find(c =>
    c.name.toLowerCase() === norm ||
    c.englishName.toLowerCase() === norm ||
    c.dbAliases.some(a => a.toLowerCase() === norm)
  );
  if (!c) return '';
  return String.fromCodePoint(...[...c.isoA2.toUpperCase()].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
}
```

### 4. Affichage

**ProspectDetail.tsx**
- Badge pays (ligne 582) : préfixer par `{getCountryFlag(prospect.country)} `.
- Bloc adresse (ligne 786+) : ajouter une ligne `state` si présent, et `{getCountryFlag(country)} {country}` à la fin.
- Nouveau bloc card "Provenance" rendu si `prospect.source === 'sourcing'` : badge "Recherche sur-mesure", `Score : X/10` (couleur selon seuils 8/5), `Pertinence : <source_relevance>`. Placé sous l'en-tête, avant les notes.

**Pipeline.tsx**
- Ligne 701-704 (affichage country sur carte) : préfixer drapeau.
- Sous le bloc country, si `prospect.source === 'sourcing'`, afficher un petit badge `Sur-mesure · {source_score}/10`. Étendre l'interface `Prospect` (lignes 32+) avec `source`, `source_score`, `source_relevance` et la sélection Supabase correspondante.

### 5. i18n

Ajouter clés dans `fr.json` / `en.json` :
- `prospectDetail.source.title` = "Provenance" / "Source"
- `prospectDetail.source.sourcing` = "Recherche sur-mesure" / "Custom search"
- `prospectDetail.source.score` = "Score" / "Score"
- `prospectDetail.source.relevance` = "Pertinence" / "Relevance"
- `crm.card.sourcingBadge` = "Sur-mesure" / "Custom"

## Hors périmètre

- Pas de changement à l'edge function `process-sourcing-request` (le score/reason sont déjà retournés).
- Pas de changement à `buyer_contacts`, `CRM.tsx` filtres, `Prospects.tsx`.
- Pas de prénom/nom (non disponibles dans la shortlist LLM).