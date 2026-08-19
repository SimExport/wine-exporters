# Normalisation des pays des prospects

## Objectif
Afficher un libellé de pays unique et propre partout (plus de « US » / « USA » / « United States » / « UNITED KINGDOM » côte à côte), à l'écriture comme sur les données déjà en base.

## Ce qui change

### 1. Un normalisateur partagé
Nouveau helper `normalizeCountry()` dans `supabase/functions/_shared/country.ts` :
- table de correspondance des variantes courantes (US, U.S., USA, United States of America, UK, Great Britain, Deutschland, Nederland, Holland, Espana, Italia, etc.) et des codes ISO-2 / ISO-3 vers un libellé canonique unique en anglais (`United States`, `United Kingdom`, `Germany`, `Netherlands`, `Ireland`, `Australia`, `Norway`, `Portugal`…).
- casse normalisée en Title Case pour tout ce qui n'est pas dans la table (donc `UNITED KINGDOM` → `United Kingdom`, `usa` → `United States`).
- valeur vide / inconnue → `null` (pas de pays inventé).

Le libellé reste stocké en anglais en base ; l'affichage FR côté app continue d'utiliser la traduction existante des noms de pays.

### 2. Application à l'écriture
Passer le pays par `normalizeCountry()` avant chaque écriture dans `campaign_interested_contacts` :
- `supabase/functions/enrich-campaign-prospects/index.ts` (pays issu du match `buyer_contacts` ou de la réponse Claude)
- `supabase/functions/sync-brevo-campaign/index.ts` (pays déduit du TLD ou du match)
- `supabase/functions/submit-campaign-interest/index.ts` (pays saisi dans le formulaire)

Aucun autre comportement de ces fonctions n'est touché (scores, prompts, matching, dédup inchangés).

### 3. Nettoyage des données existantes
Une mise à jour de données (pas de changement de schéma) sur `campaign_interested_contacts` pour appliquer les mêmes correspondances aux lignes déjà présentes : `US`/`USA` → `United States`, `UNITED KINGDOM` → `United Kingdom`, mise en Title Case du reste, vide → `null`. Aucune autre colonne modifiée.

## Vérification
Après déploiement : contrôle en base que la liste distincte des pays de `campaign_interested_contacts` ne contient plus de doublons de casse ou d'abréviation, sur la campagne Août 2026 et globalement.

## Hors périmètre
Pas de modification des pages, composants, autres tables (`leads`, `buyer_contacts`) ni du scoring.
