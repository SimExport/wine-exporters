# WineExporters — marchés de création de campagne

## Livraison préparée, pas mise en service

Le choix confirmé est **code et tests seulement**. Aucun import, création de liste, envoi ou publication n'est autorisé. `CAMPAIGN_MARKET_EXTENSION_ENABLED` reste `false` : `/create-campaign` garde exactement ses 44 choix historiques, dans leur ordre/groupes, traduits sans changer les valeurs enregistrées. Les nouveaux choix ne sont pas proposés avant que le ciblage serveur soit disponible.

Le futur chemin activé ajoute uniquement les pays avec ≥50 emails candidats distincts **et** une liste vérifiée contenant un contact non bloqué. Les 44 marchés historiques ne sont pas retirés pour un volume inférieur à 50. L'ouverture attend la remise en état de toutes leurs listes pour éviter une diminution de choix ou un ciblage fictif. En cas d'erreur de l'agrégat, pas d'activation des nouveaux choix.

## Calcul et sécurité

`get_campaign_market_counts()` expose uniquement `(country, usable_email_count)`. Une session est obligatoire et les essais ExportVins sont refusés. EXECUTE est réservé à `authenticated`, pas à PUBLIC/anon; les tables, données et autres RPC restent inchangées. Le normaliseur propre aux campagnes ne réécrit rien.

Extraction des emails multiples, casse et espaces normalisés, dédoublonnage par pays. Les tokens `do_not_mail`, invalid/bounced/hard_bounce/blocked/blacklisted/unsubscribed/suppressed/abuse sont exclus, même dans un statut composite. Un statut vide/inconnu/catch-all ne constitue **pas** une preuve de délivrabilité. Le volume Supabase n'est pas le nombre de contacts envoyables dans Brevo.

L'avertissement Supabase « authenticated SECURITY DEFINER executable » est attendu ici : cette lecture agrégée est explicitement destinée aux utilisateurs connectés, contrairement aux tables internes. Auth obligatoire, exclusion trial, projection agrégée et `search_path` verrouillé sont les contrôles compensatoires vérifiés. Ne pas étendre les droits pour satisfaire cet avertissement. Les autres alertes préexistantes sont hors périmètre.

## Correspondances vérifiées, sans ID inventé

Le catalogue conserve les IDs historiques; les ajouts de mapping utilisent Portugal 10, Canada 33, Hong Kong 38 et Bulgarie 21. Slovaquie 167, Chypre 142 et Luxembourg 157 existent déjà. Une lecture de Brevo a confirmé que Canada était omis dans la campagne 373 et UAE dans la campagne 372 : les anciennes campagnes ne sont ni modifiées ni renvoyées.

Nouveaux candidats, après dédoublonnage SQL : Philippines 173; Slovaquie 139; Indonésie 67; Bulgarie 69; Chypre 62; Malaisie 56; Luxembourg 57; Islande 56; Azerbaïdjan 54. Aucun autre nouveau pays à ≥50 trouvé après regroupement des variantes présentes.

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
5. Activer le nouveau catalogue seulement après ces preuves, vérifier le diff puis publier séparément. La checkbox autres marchés garde son sens, sans ajout automatique de pays.

## Vérifications

Tests Bun du catalogue/lecture et du script; Deno du précontrôle, sender et de la file avec fournisseurs simulés. SQL dans `supabase/tests/campaign_market_counts_rollback.sql`, exécuté administrativement avec annulation de toutes les fixtures. Aucun test ne doit appeler un sender distant.

L'environnement Supabase externe ne fournit pas de session de navigateur gérée : un rendu isolé avec réponses simulées ne vaut pas une validation authentifiée de bout en bout. La publication et le déploiement ne sont pas inclus dans cette livraison.

Résultats de cette livraison : 25 tests Bun et 33 tests Deno réussis, contrôle Deno des fonctions réussi; test SQL exécuté avec ROLLBACK, zéro fixture restante, RLS et cron inchangés. Compilation automatique réussie, diagnostics vides. Les tests de la file exercent le worker local historique avec Brevo simulé : ils ne valident pas la version live ni le quota à deux départs. Contrôle navigateur isolé de la page FR/EN, limite 15, retrait puis sélection disponible, checkbox conservée et erreur RPC/retry; aucune session réelle ni soumission. Correctif de débordement de l'en-tête français sur mobile, sans refonte.

Migrations appliquées : `20261124162751_18fb0441-4dbd-4068-afd9-4f0ddf51cbf2.sql` (lecture agrégée et normaliseur) et `20261124170934_a3c1c238-aaef-4071-bd87-495b66703d57.sql` (correction de l'alias Bosnie). Aucune table/colonne ou donnée métier créée/modifiée. Types Supabase régénérés par l'outil. Les fonctions d'envoi sont préparées dans le dépôt uniquement, pas déployées.