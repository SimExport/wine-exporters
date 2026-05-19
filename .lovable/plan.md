## Constat

Sur `/profile` aujourd'hui :

1. **Score plafonné à ~85 %** : la barre compte `wine_types`, `grape_varieties` et `cuvees` sur la fiche profil, mais ces données sont en réalité saisies dans l'onglet **Vins** (chaque cuvée a son nom, sa couleur et ses cépages). Les colonnes du profil restent donc vides → 3 cases jamais cochables = ~23 % perdus.
2. **Points forts (`strengths`)** : la colonne existe en base et est sauvegardée (`strengths: ['', '', '']`), mais aucun champ visible ne permet de les renseigner.
3. **Doublons dans l'onglet Général** :
   - Types de vin (rouge / blanc / rosé…) → déjà déduit de la couleur de chaque cuvée.
   - Cépages cultivés → déjà saisis cuvée par cuvée.
   - Cuvées → liste déjà gérée dans l'onglet Vins.
   - Changement de mot de passe → déjà disponible dans `/settings`.
4. **Onglet Site web** : un seul champ URL, pas de réseaux sociaux alors que la colonne `social_media` (jsonb) existe déjà en base.

## Modifications proposées

### 1. Onglet Général — alléger
Dans `src/pages/Profile.tsx` :
- Retirer la section "Types de vin" (checkboxes).
- Retirer la section "Cépages cultivés".
- Retirer la section "Cuvées".
- Retirer la carte "Changer mon mot de passe" (et le state / handler associé + import `KeyRound`) — on garde uniquement celle de Settings.
- Conserver : nom du domaine, contact, localisation, AOC, surface, bouteilles/an, certifications, conversion bio.

### 2. Onglet Général — ajouter "Points forts du domaine"
Nouvelle carte avec 3 champs texte courts (max 80 caractères), reliés à `formData.strengths[0..2]` (le handler `handleStrengthChange` existe déjà). Placeholders type "Vendanges manuelles", "Vinification parcellaire", etc.

### 3. Onglet Site web — réseaux sociaux
Étendre la carte existante avec 4 champs URL optionnels (Instagram, Facebook, LinkedIn, X/Twitter), stockés dans la colonne `social_media` (jsonb) déjà présente sur `profiles`. Sauvegarde via le même auto-save / submit.

### 4. Score de complétion — recalibrer
Nouveau set de 11 champs réellement saisissables sur la fiche :
```text
domain_name, contact_name, location, aoc, bottles_per_year,
certifications, strengths (>=1 rempli),
priority_markets, current_markets, target_buyer_description,
description (>=300), website
```
Plus un champ "a au moins 1 cuvée" dérivé de la table `wines` (chargé en parallèle) pour remplacer `cuvees / grape_varieties / wine_types`. Le label pointe vers l'onglet **Vins**.

Résultat : un utilisateur qui a tout rempli atteint 100 %.

### 5. i18n
Ajouter / retirer les clés correspondantes dans `src/i18n/locales/fr.json` et `en.json` :
- Nouvelles : `profile.general.strengths.*`, `profile.website.social.*`, `profile.completion.fields.strengths`, `profile.completion.fields.wines`.
- Supprimées : clés des sections retirées (wineTypes / grapes / cuvees / password sur cette page).

## Détails techniques

- Aucune migration SQL nécessaire : `strengths` (text[]) et `social_media` (jsonb) existent déjà sur `profiles`.
- `handleAutoSave` / `handleSubmit` : ajouter `social_media: formData.social_media` au payload.
- Charger `wines.count` dans `loadProfile()` (ou un petit `useEffect` séparé) pour le critère de complétion "au moins une cuvée".
- Garder la rétrocompatibilité : on ne supprime pas les colonnes `wine_types / grape_varieties / cuvees` côté DB, on arrête juste de les éditer ici.

## Hors périmètre

- Pas de changement sur l'onglet Vins ni sur Settings.
- Pas de purge des anciennes valeurs en base.
