# Afficher l'enrichissement dans la fiche admin

## Ce que montre la vérification

Les données de la campagne « Juillet 2026 » (Château de France) sont bien enrichies en base :

- 27 prospects, tous d'origine « cliqueur »
- 27/27 ont une description en français et un nom de société déduit du domaine (JV Wines, Knox Beverages, Berkshire Brewing Company, Global Fine Wines…)
- Pays corrigés quand le domaine le permet (Australia, Netherlands…), sinon United States
- Notes comprises entre 4 et 7/10
- 17/27 ont un bloc « Actions recommandées » ; 10 lignes enrichies plus tôt n'en ont pas encore

Le problème est donc uniquement d'affichage : le panneau admin ouvert depuis la colonne « Formulaires » n'affiche qu'email, société, pays, date et le badge « Enrichi ». Ni la description, ni la note, ni les actions recommandées n'y sont rendues — d'où l'impression que rien n'a été enrichi.

## Ce qui va changer

1. Panneau admin « Formulaires » : chaque carte affiche en plus
   - la note sur 10 (badge)
   - un badge d'origine (Formulaire / Cliqueur)
   - la description complète
   - le bloc « Actions recommandées » (repliable, comme côté utilisateur)
2. Les 10 prospects sans actions recommandées : relancer « Tout ré-enrichir » sur la campagne pour les compléter (aucun code à changer, l'action existe déjà).

## Détails techniques

- `src/pages/AdminCampaigns.tsx` : enrichir le rendu des cartes du sheet des réponses (lignes ~1291-1329) avec `score`, `origin`, `description`, `recommended_actions`. Vérifier que la requête alimentant `responsesByCampaign` sélectionne bien ces colonnes, sinon les ajouter au `select`.
- Nouvelles clés i18n dans `adminCampaigns.responsesSheet` (FR/EN) : `score`, `description`, `actions`, `originForm`, `originClick`.
- Aucune modification de base de données ni d'Edge Function.