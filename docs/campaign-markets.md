# WineExporters — marchés de création de campagne

## Livraison préparée, pas mise en service

La nouvelle instruction Simon du 24 novembre remplace le plan précédent : **102 choix en prévisualisation = 44 historiques + les 58 ajouts explicitement demandés**, sélection minimum 5/maximum 20. Aucun import, création de liste, envoi, publication ou changement du Supabase live. `CAMPAIGN_MARKET_EXTENSION_ENABLED=true` ouvre le catalogue de brouillon ; `CAMPAIGN_MARKET_SEND_EXTENSION_ENABLED=false` empêche la soumission des nouveaux marchés avant la mise en service séparément approuvée. Les valeurs historiques, leur ordre relatif et la checkbox autres marchés sont conservés. Afrique, Océanie et Moyen-Orient ont leurs groupes distincts.

Les niches sous 50 ne sont plus filtrées. Les 58 pays existent dans buyer_contacts, avec au moins un email candidat distinct chacun (lecture du 24/11). Un pays sans audience préparée reste sélectionnable en brouillon mais affiche son blocage exact ; soumission refusée avant toute écriture, débit de crédit ou notification. Aucune donnée ou volume inventé affiché. Si l’agrégat échoue, le catalogue reste visible, les nouveaux marchés ne deviennent jamais prêts et la soumission est bloquée. La disponibilité Brevo est un constat technique, pas une autorisation légale de prospection : tous les nouveaux pays restent bloqués pour l’envoi en attendant activation/revue. Russie/Biélorussie ne sont pas ajoutées automatiquement ; les anciens IDs restent conservés pour l’historique.

## Calcul et sécurité

`get_campaign_market_counts()` expose uniquement `(country, usable_email_count)`. Une session est obligatoire et les essais ExportVins sont refusés. EXECUTE est réservé à `authenticated`, pas à PUBLIC/anon; les tables, données et autres RPC restent inchangées. Le normaliseur propre aux campagnes ne réécrit rien.

Extraction des emails multiples, casse et espaces normalisés, dédoublonnage par pays. Les tokens `do_not_mail`, invalid/bounced/hard_bounce/blocked/blacklisted/unsubscribed/suppressed/abuse sont exclus, même dans un statut composite. Un statut vide/inconnu/catch-all ne constitue **pas** une preuve de délivrabilité. Le volume Supabase n'est pas le nombre de contacts envoyables dans Brevo.

L'avertissement Supabase « authenticated SECURITY DEFINER executable » est attendu ici : cette lecture agrégée est explicitement destinée aux utilisateurs connectés, contrairement aux tables internes. Auth obligatoire, exclusion trial, projection agrégée et `search_path` verrouillé sont les contrôles compensatoires vérifiés. Ne pas étendre les droits pour satisfaire cet avertissement. Les autres alertes préexistantes sont hors périmètre.

## Correspondances vérifiées, sans ID inventé

Le catalogue conserve les IDs historiques; les ajouts de mapping utilisent Portugal 10, Canada 33, Hong Kong 38 et Bulgarie 21. Slovaquie 167, Chypre 142 et Luxembourg 157 existent déjà. Une lecture de Brevo a confirmé que Canada était omis dans la campagne 373 et UAE dans la campagne 372 : les anciennes campagnes ne sont ni modifiées ni renvoyées.

Ancien audit à neuf candidats remplacé par la liste approuvée de 58 ci-dessous. Les noms FR/EN et drapeaux réutilisent le registre pays existant. Les comparaisons normalisent espaces Unicode, USA/United States, les quatre subdivisions UK avec/sans suffixe, UAE, Bosnia-Herzegovina, Macao/Macau, Türkiye/Turkey et Curaçao/Curacao sans écrire dans les données historiques.

Listes absentes : Philippines, Indonésie, Malaisie, Islande, Azerbaïdjan, et les marchés historiques Chili, Pérou, UAE, Maroc, Nigeria. Listes historiques sans aucun contact envoyable lors de l'audit : Argentine, Colombie, Inde, Serbie et Grèce. Chypre et Luxembourg sont entièrement bloquées; Slovaquie et Bulgarie ont respectivement 25 et 16 contacts non bloqués. Le relevé dans `campaign-market-readiness.ts` est un instantané de lecture, **pas** une autorisation d'envoi ni d'ouverture du nouveau catalogue.

## Réconciliation administrative future

Par défaut le script ne fait que des GET. `--write-readiness` met à jour uniquement les IDs/effectifs contrôlés dans le dépôt, sans adresses ni secrets.

```sh
bun scripts/reconcile-campaign-market-lists.ts --write-readiness
```

Un futur import exige une autorisation séparée, un JSON privé hors du dépôt avec `country,email,email_status,company_name`, et une allowlist ISO explicite. Ne pas persister ce fichier dans l'app, le partager ni afficher ses emails dans les logs.

```sh
bun scripts/reconcile-campaign-market-lists.ts --contacts=/tmp/approved-contacts.json --markets=PH,ID --apply --confirm=WineExporters
```

Vérifier au préalable qu'aucune automatisation Brevo ne se déclenche à l'inscription dans ces listes. Le script ne contacte jamais les API emailCampaigns/smtp/sendNow, ne modifie aucune liste de clients ExportVins et ne réactive aucun contact bloqué. Les membres déjà présents sont ajoutés par l'API d'appartenance aux listes uniquement; les attributs connus sont préservés. Les nouvelles listes vont dans le dossier importateurs 178. Un nom correspondant déjà présent mais non configuré exige une revue manuelle, pas une création en doublon. Les IDs nouvellement retournés doivent être reportés/revus dans le catalogue avant un nouvel audit.

## Avant activation/publication

1. Préparer/réconcilier les listes sous autorisation distincte, sans enlever de suppression.
2. Vérifier les adresses par pays contre Supabase, les exclusions et au moins un contact effectivement ciblable dans chaque liste. Refaire le relevé; tous les marchés historiques doivent être opérationnels.
3. Comparer les sources déployées des senders avec ce dépôt. **Ne pas redéployer `queue-worker.ts` local : son quota à 1/jour est obsolète.** Intégrer seulement les imports/mapping/précontrôle dans la version live pour préserver les créneaux 10h/15h et toutes les protections existantes.
4. Déployer les chemins legacy, manuel et planifié avec le même catalogue, sur autorisation explicite. `campaignMarketPreflight` résout tous les pays, vérifie identité + disponibilité des listes et pages de contacts non bloqués avant tout POST/mutation; aucun pays ignoré.
5. Le catalogue est déjà ouvert **en prévisualisation seulement** ; après ces preuves activer uniquement la soumission des nouveaux marchés, vérifier le diff puis publier séparément. La checkbox autres marchés garde son sens, sans ajout automatique de pays.

## Vérifications

Tests Bun du catalogue/lecture et du script; Deno du précontrôle, sender et de la file avec fournisseurs simulés. SQL dans `supabase/tests/campaign_market_counts_rollback.sql`, exécuté administrativement avec annulation de toutes les fixtures. Aucun test ne doit appeler un sender distant.

L'environnement Supabase externe ne fournit pas de session de navigateur gérée : un rendu isolé avec réponses simulées ne vaut pas une validation authentifiée de bout en bout. La publication et le déploiement ne sont pas inclus dans cette livraison.

Vérifications du 24/11 : 32 tests Bun (catalogue/lecture/alias/limites/reconciliation/ciblage), 12 tests Deno (précontrôle et sender avec fournisseurs simulés), tests SQL dans un PostgreSQL PGlite isolé avec ROLLBACK ; aucun appel Resend/Brevo réel dans les tests. Quatre scénarios Playwright isolés : FR ordinateur, EN téléphone, brouillon historique USA/England (UK)/UAE conservé, erreur agrégat FR téléphone. 102 boutons, limites 4/5/20/21, sélection niches, compteur, checkbox, désélection et blocage de soumission vérifiés ; aucune écriture ni appel externe dans ces scénarios. Compilation automatique réussie. Une vraie session est indisponible sur le Supabase externe : sauvegarde/relecture connectée non vérifiée, particulièrement au-delà de 15 car la migration n’est pas appliquée.

Migrations appliquées : `20261124162751_18fb0441-4dbd-4068-afd9-4f0ddf51cbf2.sql` (lecture agrégée et normaliseur) et `20261124170934_a3c1c238-aaef-4071-bd87-495b66703d57.sql` (correction de l'alias Bosnie). Aucune table/colonne ou donnée métier créée/modifiée. Types Supabase régénérés par l'outil. Les fonctions d'envoi sont préparées dans le dépôt uniquement, pas déployées.
## Migration requise mais NON appliquée

`docs/campaign-market-limits-draft.sql` est du SQL de brouillon, **pas une migration déjà exécutée**. À soumettre par l’outil migration seulement après autorisation :
- Plafond de sauvegarde `campaigns_markets_count_check` : 1–20, pour garder les brouillons partiels ; aucun UPDATE des données.
- Garde serveur de transition draft → pending_validation : 5–20 pays distincts normalisés, avant toute consommation de crédit ; les anciennes campagnes envoyées/manuelles ne sont pas revalidées.
- Normaliseur campagne complété, même signature, droits privés préservés ; RPC agrégée inchangée, RLS/crédits/cron inchangés.
- `NOT VALID` évite de rejeter ou réécrire des données historiques à l’application.

**La base LIVE conserve actuellement son plafond de 15** : la sélection de 20 est vérifiée en prévisualisation mais une sauvegarde réelle de 16–20 échouera jusqu’à application de ce SQL. Ne pas présenter cette livraison comme une mise en service complète. Le SQL a réellement été appliqué à une base PGlite temporaire avec fixtures et rollback, jamais au projet Supabase ; `supabase/tests/campaign_market_limits_rollback.sql` conserve les assertions (4/5/20/21, alias, brouillons vides, conteneurs manuels, historique). Aucun fichier sous supabase/migrations créé.

## Audit des 58 nouveaux marchés (lecture 24/11/2026)

Tous existent dans buyer_contacts. Emails = candidats syntaxiquement exploitables distincts après exclusions/alias, **pas livrés ni garantis**. Les trois petites audiences existantes ont été relues en GET : Malta 158 = 1 non-bloqué ; Lithuania 156 = 4 ; Latvia 155 = 3. Slovakia 167 = 25 et Bulgaria 21 = 16 proviennent du relevé Brevo du même jour. Aucun ID source BWI/VINATY ou liste client substitué.

| Marché canonique | Emails candidats Supabase | Blocage / audience Brevo |
|---|---:|---|
| Philippines | 173 | Liste pays absente ; préparation sous autorisation |
| Slovakia | 139 | Liste 167 : 25 non-bloqués ; activation/déploiement requis |
| Indonesia | 67 | Liste pays absente ; préparation sous autorisation |
| Bulgaria | 69 | Liste 21 : 16 non-bloqués ; activation/déploiement requis |
| Cyprus | 62 | Liste existante, 0 non-bloqué |
| Malaysia | 56 | Liste pays absente ; préparation sous autorisation |
| Luxembourg | 57 | Liste existante, 0 non-bloqué |
| Iceland | 56 | Liste pays absente ; préparation sous autorisation |
| Azerbaijan | 54 | Liste pays absente ; préparation sous autorisation |
| Slovenia | 41 | Liste pays absente ; préparation sous autorisation |
| Malta | 35 | Liste 158 : 1 non-bloqués ; activation/déploiement requis |
| Lithuania | 34 | Liste 156 : 4 non-bloqués ; activation/déploiement requis |
| Latvia | 26 | Liste 155 : 3 non-bloqués ; activation/déploiement requis |
| New Zealand | 30 | Liste pays absente ; préparation sous autorisation |
| Israel | 32 | Liste pays absente ; préparation sous autorisation |
| Cambodia | 29 | Liste pays absente ; préparation sous autorisation |
| Albania | 29 | Liste pays absente ; préparation sous autorisation |
| Costa Rica | 24 | Liste pays absente ; préparation sous autorisation |
| Puerto Rico | 24 | Liste pays absente ; préparation sous autorisation |
| Kenya | 22 | Liste pays absente ; préparation sous autorisation |
| Ecuador | 21 | Liste pays absente ; préparation sous autorisation |
| Uruguay | 20 | Liste pays absente ; préparation sous autorisation |
| Dominican Republic | 19 | Liste pays absente ; préparation sous autorisation |
| Turkey | 18 | Liste pays absente ; préparation sous autorisation |
| Montenegro | 16 | Liste pays absente ; préparation sous autorisation |
| Panama | 15 | Liste pays absente ; préparation sous autorisation |
| Mauritius | 13 | Liste pays absente ; préparation sous autorisation |
| Kazakhstan | 11 | Liste pays absente ; préparation sous autorisation |
| Seychelles | 10 | Liste pays absente ; préparation sous autorisation |
| Maldives | 10 | Liste pays absente ; préparation sous autorisation |
| Macau | 7 | Liste pays absente ; préparation sous autorisation |
| Guatemala | 36 | Liste pays absente ; préparation sous autorisation |
| Ukraine | 35 | Liste pays absente ; préparation sous autorisation |
| Armenia | 21 | Liste pays absente ; préparation sous autorisation |
| Lebanon | 17 | Liste pays absente ; préparation sous autorisation |
| Bosnia and Herzegovina | 16 | Liste pays absente ; préparation sous autorisation |
| North Macedonia | 13 | Liste pays absente ; préparation sous autorisation |
| Jamaica | 10 | Liste pays absente ; préparation sous autorisation |
| Bahrain | 10 | Liste pays absente ; préparation sous autorisation |
| Jordan | 11 | Liste pays absente ; préparation sous autorisation |
| French Polynesia | 11 | Liste pays absente ; préparation sous autorisation |
| New Caledonia | 6 | Liste pays absente ; préparation sous autorisation |
| Andorra | 16 | Liste pays absente ; préparation sous autorisation |
| San Marino | 17 | Liste pays absente ; préparation sous autorisation |
| Namibia | 11 | Liste pays absente ; préparation sous autorisation |
| Paraguay | 13 | Liste pays absente ; préparation sous autorisation |
| El Salvador | 16 | Liste pays absente ; préparation sous autorisation |
| Honduras | 14 | Liste pays absente ; préparation sous autorisation |
| Fiji | 13 | Liste pays absente ; préparation sous autorisation |
| Nicaragua | 11 | Liste pays absente ; préparation sous autorisation |
| Curacao | 10 | Liste pays absente ; préparation sous autorisation |
| Aruba | 13 | Liste pays absente ; préparation sous autorisation |
| Ghana | 7 | Liste pays absente ; préparation sous autorisation |
| Senegal | 5 | Liste pays absente ; préparation sous autorisation |
| Tanzania | 8 | Liste pays absente ; préparation sous autorisation |
| Bahamas | 4 | Liste pays absente ; préparation sous autorisation |
| Barbados | 4 | Liste pays absente ; préparation sous autorisation |
| Trinidad and Tobago | 4 | Liste pays absente ; préparation sous autorisation |

Bilan nouveaux marchés : **51 sans liste pays, 2 listes vides/bloquées, 5 audiences présentes mais activation/déploiement non autorisés**. Les 10 blocages historiques restent signalés, sans retirer leurs choix : Chili/Pérou/UAE/Maroc/Nigeria sans liste ; Argentine/Colombie/Inde/Serbie/Grèce sans contact envoyable. Aucun pays ne disparaît silencieusement du ciblage.
