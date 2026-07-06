# Unification du scoring sur /10

## Objectif
Aligner tous les scores prospects sur une échelle /10, avec des plages contextuelles selon la source.

## Plages retenues
- **Formulaire d'intérêt** (soumission volontaire) : **6–10** (plancher élevé car intention forte)
- **Cliqueurs** (ouvertures/clics email, futur import) : **4–7**
- **Recherches sur-mesure** : échelle native **1–10** conservée (déjà en place)

## Changements

### 1. Edge function `submit-campaign-interest`
- Modifier le prompt Anthropic : demander un entier **6-10** au lieu de 1-5, en expliquant la logique (soumission = intention forte).
- Fallback score : passer de `3` à `7`.
- Validation : clamp entre 6 et 10 (au lieu de 1-5).
- La valeur écrite dans `campaign_interested_contacts.score` **et** `leads.source_score` sera donc sur 10.

Note : pas de migration SQL (les colonnes sont `integer`, aucune contrainte 1-5 côté base). Les anciennes lignes 1-5 restent telles quelles ; on peut optionnellement les remapper (voir §4).

### 2. Affichage `/5` → `/10`
Un seul endroit code en dur `/5` :
- `src/components/campaigns/InterestedContactsSection.tsx`
  - Badge : `{c.score}/5` → `{c.score}/10`
  - Seuils de variante badge : `>=4 default, >=3 secondary` → `>=8 default, >=6 secondary, sinon outline`
  - Filtre `scoreFilter` (options "Tous / 3+ / 4+ / 5") → adapter à `6+ / 8+ / 10` avec les libellés i18n correspondants.

`ProspectDetail.tsx` affiche déjà `source_score/10` avec seuils 8/5 — rien à changer.

### 3. Helper de source (optionnel, léger)
Ajouter dans `src/lib/format.ts` (ou nouveau `src/lib/score.ts`) un helper `getScoreRangeForSource(source)` retournant `{min, max}` — utilisé par la future ingestion "cliqueurs" et documenté en commentaire. Pas d'UI/logique métier nouvelle pour les cliqueurs (aucune ingestion existante aujourd'hui).

### 4. Remap des anciennes valeurs 1-5 (recommandé)
Migration SQL one-shot pour remapper les scores existants issus du formulaire vers 6-10 :
```
UPDATE campaign_interested_contacts
SET score = LEAST(10, GREATEST(6, 5 + score))
WHERE score BETWEEN 1 AND 5;

UPDATE leads
SET source_score = LEAST(10, GREATEST(6, 5 + source_score))
WHERE source = 'interest_form' AND source_score BETWEEN 1 AND 5;
```
Formule : 1→6, 2→7, 3→8, 4→9, 5→10.

### 5. i18n
Mettre à jour libellés du filtre score (fr/en) : "Score ≥ 6 / ≥ 8 / = 10".

## Fichiers touchés
- `supabase/functions/submit-campaign-interest/index.ts`
- `src/components/campaigns/InterestedContactsSection.tsx`
- `src/lib/score.ts` (nouveau, petit)
- `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`
- 1 migration SQL (remap)

## Hors scope
- Ingestion des cliqueurs (aucune source de leads "click" n'existe encore — la plage 4-7 est réservée pour cette future feature via le helper).
- Recherches sur-mesure : aucun changement, déjà sur /10.
