# Suivi quotidien de l'enrichissement (Tableau de bord + Importateurs)

## Résultat attendu
Un petit encart « Nouvelles fiches enrichies » montre seulement des chiffres par pays, sans noms d'acheteurs :
- « +12 Allemagne · +7 Royaume-Uni · +4 Belgique… aujourd'hui », avec un total du jour (« +23 fiches enrichies aujourd'hui »).
- Si rien n'a été enrichi aujourd'hui : chiffres des 7 derniers jours (« +48 cette semaine »), pour que l'encart ne soit jamais vide.
- Drapeaux et noms de pays traduits FR/EN, au maximum 6 pays affichés puis « +N autres pays ».

## Emplacements
- **Tableau de bord** : encart sous « Bien démarrer », aux couleurs bordeaux/or, avec un lien « Explorer la base ».
- **Importateurs** : bandeau compact au-dessus de la carte. Cliquer un pays ouvre directement sa liste (les fiches enrichies sont déjà en tête, avec le badge).

## Ce qui ne change pas
Aucun nom, contact ou contenu enrichi n'est révélé dans l'encart. Liste, tri, badge, crédits, exports, CRM et routines d'enrichissement inchangés. Comptes d'essai ExportVins : encart absent (la page Importateurs leur est déjà fermée).

## Détails techniques
- Nouvelle RPC `get_enrichment_activity(_days int)` SECURITY DEFINER, `search_path` sûr, `auth.uid()` obligatoire, essais ExportVins refusés (mêmes règles que `search_buyer_contacts`). Renvoie uniquement `country, count` des fiches dont la première date d'enrichissement (`created_at` de `buyer_contact_enrichments`, sinon `last_enriched_at`) tombe dans la période, jour calculé en heure de Paris. EXECUTE pour `authenticated` seulement, révoqué pour public/anon.
- Composant partagé `EnrichmentActivityCard` (variante carte / bandeau), helper React-free de mise en forme (tri décroissant, regroupement « autres pays », bascule jour → 7 jours) avec tests.
- Clés i18n FR/EN ; aucune modification des tables existantes ni de leurs règles d'accès.
- Vérification : vérifier les chiffres réels par requête avant affichage, anonyme refusé, rendu FR/EN.
