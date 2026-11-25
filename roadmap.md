# Roadmap — Passerelle ExportVins (essai CRM 30 jours)

## Appels d’offres — recherche et filtres V1
- [x] Audit en lecture seule : 150 appels publiés, 33 échéances absentes, aucune date de début ; chargement par lots sur toute la collection.
- [x] Recherche sur les champs FR/EN, marchés/types normalisés, échéances, tri et pagination de dix résultats ; demandes directes, archives et actions CRM préservées.
- [x] Tests unitaires et rendu FR/EN ordinateur/mobile sur 350 appels fictifs, recherche au-delà de la première page, reprise après erreur et actions CRM/archives simulées ; compilation automatique réussie, aucune publication ni écriture réelle.
- [ ] Contrôle avec un vrai compte producteur — session non disponible pour le Supabase externe ; pas de filtre « à venir » car aucune date de début n’existe.

## Marchés de création de campagne — extension ciblée
- [x] Instruction Simon du 24/11 : 44 marchés conservés, 58 ajouts vérifiés sans seuil de 50, catalogue 102 et sélection 5–20 en prévisualisation.
- [x] Existence/alias vérifiés en lecture Supabase ; inventaire et 3 audiences additionnelles Brevo vérifiés sans import ni envoi.
- [x] Catalogue, validations UI et FR/EN adaptés ; migrations 5–20 et alias préparées/testées dans PostgreSQL isolé, non appliquées au Supabase live.
- [x] Tests 5/20/21, historique et ciblage simulé ; rendu FR/EN ordinateur/mobile sans débordement, compilation automatique OK. Parcours connecté non vérifiable.
- [x] Mise en service du 24/11 (OK Simon) : limite 1–20 / soumission 5–20 appliquée et testée en base avec annulation ; 56 listes pays créées, 12 complétées (1 780 contacts créés, 16 rattachés, 137 bloqués laissés intacts) ; 102 marchés ciblables vérifiés en lecture ; 3 fonctions d'envoi déployées ; aucun envoi.
- [ ] Publication du frontend — à faire par Simon après relecture ; première exécution planifiée réelle du worker redéployé : 25/11 10h Paris, à surveiller.

## Notifications opportunités — reprise ciblée
- [x] Suivi SQL privé admin, lots 49 BCC, reprise atomique et compteurs ; 7 tests simulés, tests SQL annulés et Deno check réussis ; compilation automatique OK. Contrôle visuel isolé avec réponses simulées, pas de session admin réelle.
- [x] Préchargement séparé relu : 15 acceptés avec l’ID Resend connu, 50 en attente, zéro adresse fictive persistée.
- [ ] Déployer uniquement notify-new-opportunities puis publier la page manuellement — attend la validation de Simon ; aucun envoi réel effectué.

## Guides de marché de l’annuaire public
- [x] `directory_country_guides` créée et laissée vide ; lecture publique des seuls guides publiés et écriture admin calquée sur `seo_articles`, sans seed ni publication.
- [x] Guide FR/EN validé sur les pages pays, avec sources, FAQ/JSON-LD, articles publiés liés et CTA analyse ; rendu historique conservé sinon.
- [x] Guides publiés embarqués dans le pré-rendu `.html` ; 17 tests, TypeScript, build des 42 pages et parcours public ordinateur/mobile vérifiés sans appels privés ni déploiement.
- [ ] Rédaction, revue et publication des guides réels — en attente de validation éditoriale de Simon ; aucun contenu inséré dans la table.

## Résultats automatiques J+2
- [x] Traitement J+2 et quatre fonctions déployés ; secret interne installé dans Vault, file et verrous protégés, cron quotidien actif à 08:00 UTC, drain uniquement pendant la file. Dix tests simulés, types et build OK ; appels non authentifiés refusés, dry-run sans fournisseurs. 53 résultats historiques et campagne active inchangés ; première exécution réelle attend le prochain cron. Envoi incertain : réconciliation obligatoire.

## Invitation Stripe après premier paiement
- [x] Webhook existant : première facture payée, trois prix autorisés, jobs conditionnels, invitation/activation sans réinitialiser les crédits ; 13 tests simulés et contrôle Deno réussis, stripe-webhook seul déployé ; endpoint actif refuse un appel non signé (400). Aucun paiement ni email réel de test. Lecture indépendante du code distant non disponible ; envoi de mail incertain conservé en échec pour réconciliation manuelle.

## Correction ciblée fiche importateur

- [x] Personnes structurées, emails dédupliqués, notes commerciales via RPC existante et statut confirmed ; Wuttke confirmé en lecture seule (3 personnes, 0 email structuré), 9 tests réussis et panneau isolé ordinateur/mobile vérifié, build OK ; campagnes/automatisations inchangées.
- [ ] Vérification de la fiche Wuttke en navigation réellement connectée — session indisponible sur le Supabase externe ; le rendu isolé ne vérifie pas le parcours connecté.

## WineExporters — SEO public V1 (preview uniquement)

- [x] Point 6 BestWineImporters : audit agrégé en lecture seule, aucun chiffre retenu faute de définition/licences, blocs qualitatifs prouvés, six CTA pays vers le parcours existant ; 8 tests et rendu isolé desktop/mobile, anciens jetons et lien vérifiés (aucune publication).
- [x] Auditer schéma, droits et séparabilité/licences ; RPC privée protégée, aucune preuve de republication, risque buyer_contacts préexistant signalé, aucune écriture.
- [x] Annuaire public + six pays + template entreprise ; allowlist build/serveur vide, limites cinq par pays/trente total et projection testées.
- [x] Six articles rédigés et sourcés (US, UK, DE, BE, JP, CA), Markdown + JSON CMS en draft, zéro écriture en production.
- [x] Tests des règles et régression fiches privées, pages FR/EN desktop/mobile, noindex/canonicals, liens et refus RPC anonyme vérifiés ; approbations documentées dans docs/public-directory-seo-v1.md.
- [ ] Publication réelle des fiches — bloquée sans autorisations/licences et liste d’entreprises approuvées ; publication des articles attend la revue éditoriale et votre approbation.

## Ajustements email

- [x] Opportunités : archivage personnel persistant avec RLS, onglet Archives et restauration ; 3 tests et parcours visuel isolé réussis, aucune modification des opportunités partagées ; Authenticated path: UNVERIFIED (Supabase externe)
- [x] Opportunités : vue « Pour mon domaine » / « Toutes » (recommandations forte/ouverte/à explorer, badges, 1-2 raisons, précautions, repli sur Toutes en cas d’erreur) ; 6 tests + essai navigateur fictif FR/EN ; Authenticated path: UNVERIFIED (Supabase externe)
- [x] CRM : quatre sources FR/EN dans les vues Kanban et Liste ; campagne requise seulement pour Campagne, 7 tests et contrôles visuels isolés réussis ; ajout connecté non vérifiable sur le Supabase externe
- [x] Recherche sur-mesure : sélection multiple sur toutes les pages, ajout groupé au CRM et synthèse structurée FR/EN ; 3 tests et parcours isolé vérifiés, ajout réel connecté non vérifiable sur ce Supabase externe
- [x] Résultats campagne : une ligne par prospect, meilleure lisibilité, sources masquées côté utilisateur ; test ciblé et rendu isolé ordinateur/mobile vérifiés (parcours connecté indisponible)
- [x] Préparation email : « Claude » remplacé par « la plateforme », avis FR/EN indiquant la relecture par un admin avant validation
- [x] Génération unique, bouton centré sans compteur, avertissement FR/EN de validation ; 24 tests passés (parcours connecté non vérifiable ici)

- [x] Fiches importateurs : panneau FR/EN, couche données découplée, tests isolés et audit sécurité sans publication
- [x] Connexion enrichissement — RPC get_importer_profile (même périmètre que /importers, tout abonnement, essais exclus), repository branché ; reste à tester en navigation connectée (aucune session de test disponible)
- [x] 1. Base de données, règles serveur, useCrmAccess
- [x] 3. Pages de présentation premium, bandeau/accueil CRM, lecture seule (serveur), redirection
- [x] 2. Invitation ExportVins + import CSV dans /admin/invitations
- [x] 4. Emails J25/J30/J37 (cron 8h UTC) + arrêt des rappels
- [ ] 5. Souscription directe 99 € — en attente de votre validation du lien de paiement (audit fait)
- [x] Lecture seule dans le CRM + export CSV

## Campagnes — Lot B (fait, preview)

- [x] Étape « Préparation de l'email » (génération IA, édition, images, aperçu, sauvegarde, soumission)
- [ ] Test de bout en bout connecté par l'utilisateur (aucune session de test disponible dans le sandbox)
- [ ] Lot C : envoi admin via send-campaign, activation générale de l'éditeur

## Campagnes — Lot C (fait, preview, réglage général désactivé)

- [x] Examen admin, envoi Brevo du HTML approuvé, récupération des envois incertains, rejet motivé notifié, interrupteur général, mode test isolé
- [ ] Ajouter le secret BREVO_TEST_LIST_ID (liste Brevo interne) avant la recette
- [ ] Recette fonctionnelle globale A+B+C (par l'utilisateur)
- [ ] Activer le nouveau parcours pour tous après recette (interrupteur admin)

## Dashboard producteur — Lot A
- [x] Carte campagne par statut, pipeline (nouveaux/échantillons/négociation/gagnés), opportunités sans appels d’offres clos, 27 000+ contacts, Bien démarrer fidèle et masqué une fois terminé, erreurs visibles ; 7 tests + typecheck.
- [ ] Rendu connecté non vérifié (session indisponible sur Supabase externe) ; date de programmation non affichable (file d’envoi réservée aux admins).

## Emails multiples importateurs
- [x] Export : colonnes emails_additionnels / decideurs / emails_decideurs via RPC batch get_importer_export_contacts ; emails historiques séparés dans tableau et fiche. Tests, typecheck, build OK.
- [ ] Nettoyage des 1 636 fiches — fait séparément par Simon après validation.
- [ ] Spot 30 s dans le hero de l'accueil (structure faite ; en attente du fichier MP4 dans public/videos/)
