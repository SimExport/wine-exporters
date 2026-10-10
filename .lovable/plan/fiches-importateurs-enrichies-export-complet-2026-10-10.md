# Fiches importateurs enrichies + export complet

## 1. Deux champs CRM
- Ajout sur la table des prospects existante (`leads`) de deux champs texte longs facultatifs : `importer_description`, `relevance_reason` (type `text`, aucune limite de taille).
- Les droits existants s'appliquent tels quels : modifiables en CRM actif, bloqués en lecture seule, invisibles après fermeture.

## 2. Import CSV sur /admin/invitations
- Colonnes reconnues (insensibles casse/accents) :
  - Description : `Description importateur`, `Description`, `Importer description`, `About`
  - Pertinence : `Pourquoi pertinent`, `Pertinence`, `Why relevant`, `Relevance`
- Facultatives : `test-mission-exportvins.csv` reste valide (aperçu : 4 contacts).
- Aperçu : deux colonnes supplémentaires avec texte replié, dépliable pour lire en entier.
- CSV avec retours à la ligne entre guillemets pris en charge (textes longs).
- Seconde mission : un prospect déjà présent est ignoré, ses textes ne sont jamais écrasés. Formulaire et bouton unique inchangés.

## 3. Fiche prospect
- Deux sections dans la fiche détail, avec le style actuel : « À propos de l'importateur » et « Pourquoi cet importateur est pertinent pour votre domaine » (EN traduit).
- Texte complet, retours à la ligne conservés, bouton « Modifier » (zone de texte) si CRM actif ; masquées si vides en lecture seule.

## 4. Export complet
- Export CSV des prospects enrichi : coordonnées, description, pertinence, étape et statut, montant, échantillons (cuvées, quantités, commentaires), prochaine action, rappel, dates d'activité.
- Notes : toutes conservées dans une colonne « Notes » (chaque note datée, séparées par une ligne), plus un second fichier facultatif « Notes détaillées » (une ligne par note : prospect, date, texte) pour zéro perte.
- Disponible en CRM actif et pendant les 7 jours de lecture seule.

## Hors périmètre
Invitations classiques, abonnements, tarifs Stripe : inchangés.

## Vérification
- Import du CSV de test actuel (4 contacts) et d'un nouveau CSV avec les deux colonnes (textes longs, multi-lignes) via simulation de l'analyse CSV.
- Réimport : zéro ajout, textes existants intacts.
- Contrôle de l'export (colonnes, notes multiples).

## Détails techniques
- Migration : `ALTER TABLE leads ADD COLUMN importer_description text, ADD COLUMN relevance_reason text`.
- Fichiers : `ExportVinsInviteForm.tsx` (parseur + aperçu), `admin-invite-user/exportvins.ts` (insertion des champs), `ProspectDetail.tsx` (sections), fonction d'export du CRM/`TrialCrmBanner.tsx` (jointure `prospect_notes`, `sample_items`+`wines`, filtrage via `campaigns!inner(user_id)`), locales FR/EN.
