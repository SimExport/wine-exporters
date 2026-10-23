# Roadmap — Passerelle ExportVins (essai CRM 30 jours)
## Ajustements email
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
