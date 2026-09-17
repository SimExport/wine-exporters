# Suivi admin des analyses de marché

Nouvelle page réservée aux admins pour suivre toutes les demandes du formulaire public `/market-analysis`.

## Liste — /admin/market-analyses

Entrée « Analyses de marché » dans la section Administration (barre latérale + navigation mobile), comme les autres pages admin.

Tableau, le plus récent en premier, 10 lignes par page :
- date de la demande
- nom du domaine
- contact
- email
- marché ciblé
- statut (En attente / En cours / Terminé / Échec) sous forme de badge coloré
- nombre d'importateurs retournés
- score moyen (calculé depuis les résultats, vide si pas de résultat)
- source / campagne
- bouton « Voir l'analyse »

Filtres simples en boutons : Tous · Terminés · En erreur · Aujourd'hui · Cette semaine. Plus un champ de recherche par domaine ou email.

## Détail d'une analyse

Ouverture dans un panneau latéral depuis la liste (pas de nouvelle route), avec :
- toutes les réponses du formulaire (domaine, contact, email, site, localisation, types de vins, appellations, cœur de gamme, certifications, marché, types d'importateurs souhaités, exclusions, précisions, source/campagne/referrer)
- la synthèse marché et les 3 recommandations
- la liste des importateurs sélectionnés avec, pour chaque, le nom, la ville/pays, le site, le score /10, la justification et **les vraies coordonnées** (email, téléphone) récupérées depuis la base des importateurs
- l'éventuelle erreur technique
- la date de génération
- le `result_json` brut dans un bloc replié, pour le debug

Statuts commerciaux (démo prise / converti / perdu) : hors périmètre pour cette V1.

## Détails techniques

- Migration : ajout d'une policy `SELECT` sur `public.prospect_market_searches` réservée aux admins (`public.has_role(auth.uid(), 'admin')`) + `GRANT SELECT ... TO authenticated`. Aucune lecture publique ajoutée (le rôle `anon` reste en INSERT seul), le reste des policies est inchangé.
- Page `src/pages/AdminMarketAnalyses.tsx`, route `/admin/market-analyses` sous `AdminRoute` dans `src/App.tsx`, sur le modèle de `AdminSourcing.tsx` (mêmes composants Table/Badge/Sheet shadcn).
- Coordonnées réelles : les `buyer_contact_id` présents dans `result_json.shortlist` servent à charger `buyer_contacts` (email, téléphone) côté client à l'ouverture du détail — même accès que la page Importateurs. Rien n'est modifié dans les Edge Functions ni dans la page publique de résultat.
- Score moyen : moyenne des `score` de `result_json.shortlist`, arrondie à une décimale.
- Textes FR/EN via i18n (`adminMarketAnalyses.*`, `nav.adminMarketAnalyses`).

## Hors périmètre

Aucune modification du formulaire public, de la page de résultat, des Edge Functions, des prompts, du scoring ou des autres pages admin.
