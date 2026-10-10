# Finalisation de la passerelle ExportVins

## 1. Email de bienvenue personnalisé
- Lors d'une invitation ExportVins, le serveur génère un lien de connexion Supabase sécurisé (usage unique, connexion habituelle conservée). Il l'envoie ensuite dans un email WineExporters via Resend, au lieu de l'email Supabase standard.
- Contenu de l'email :
  - mission terminée et rapport remis ;
  - importateurs déjà dans le CRM ;
  - 30 jours offerts, qui démarrent à la première connexion ;
  - tarif privilégié de 99 € HT/mois, sans obligation ;
  - bouton « Accéder à mon CRM ».
- Charte : #59191F, titres Caacupé One avec repli serif, texte DM Sans avec repli sans-serif, logo existant, fond blanc.
- Langue : français par défaut, anglais si la langue du compte est l'anglais. Un choix FR/EN est ajouté au formulaire admin.
- Le lien reste caché : il n'apparaît que dans l'email, jamais dans le navigateur ni dans le journal.
- Les invitations classiques ne changent pas.
- Expéditeur : celui déjà utilisé pour les autres emails Resend du site.

## 2. Pages premium : prise de rendez-vous
- Le bouton principal « Débloquer WineExporters » devient **« Échanger avec nous sur l'abonnement »**. Il ouvre votre lien de rendez-vous Google Calendar existant (`calendar.app.google/rfx7N1bBhJcbwyJg9`, déjà utilisé pour la démo) dans un nouvel onglet. **À confirmer : ce lien convient-il ici aussi ?**
- L'offre « 99 € HT/mois au lieu de 199 € » reste affichée pour les comptes éligibles.
- Le bouton secondaire « Souscrire directement » est prévu dans le code mais **masqué** tant que la vérification Stripe n'est pas faite.
- Le bandeau du CRM pointe vers ce même rendez-vous.

## 3. Audit Stripe (aucune modification)
1. **Prix Fondateur reconnu ?** Oui, indirectement : la vérification faite à chaque connexion accepte n'importe quel abonnement actif, quel que soit le prix. Le paiement à 99 € donne donc l'accès Premium.
2. **Droits automatiques après un lien de paiement ?** Oui, mais avec un décalage :
   - Le webhook « paiement terminé » ne retrouve le compte que si le paiement porte l'identifiant WineExporters, ce qu'un lien de paiement simple ne fait pas : il ignore donc ce paiement.
   - L'accès est activé à la connexion suivante du domaine, grâce à la vérification par email.
3. **Rattachement au bon compte** : il se fait par l'adresse email. **Point de vigilance** : si le domaine paie avec une autre adresse que celle de son compte, rien n'est rattaché et une intervention admin sera nécessaire.
4. **Correction recommandée, pour plus tard et avec votre accord** : ajouter l'identifiant du compte à la fin du lien de paiement (`?client_reference_id=…`) ou pré-remplir l'email du client. Cela ne demande ni nouveau produit ni nouveau tarif.
5. **Résiliation** : correctement gérée par le webhook (retour en Free) et par la vérification à la connexion.
6. **Fin de l'essai après paiement** : l'essai cède automatiquement la place à l'abonnement. Les contacts, notes et historiques sont conservés.

## 4. Emails J+25 / J+30 / J+37
- Nouvelle fonction quotidienne (cron 8h UTC), via Resend, en FR/EN, avec la charte WineExporters.
  - **J+25** : il reste 5 jours.
  - **J+30** : période terminée, 7 jours pour exporter, offre à 99 €.
  - **J+37** : fin de la récupération.
- Chaque email propose un rendez-vous plutôt qu'une souscription.
- Jamais d'envoi en double : date d'envoi enregistrée et vérifiée. Jamais d'envoi à un abonné ou à un admin.
- Historique : chaque envoi est enregistré dans le journal d'emails existant et visible dans la colonne Type du journal des invitations.
- Rappels CRM quotidiens : ils s'arrêtent pour les comptes en lecture seule ou expirés, et uniquement pour eux.

## 5. Lecture seule dans le CRM
- Pendant les 7 jours de lecture seule, dans le pipeline, la liste et la fiche prospect :
  - boutons d'ajout, de modification, de changement d'étape ou de statut, de notes, de rappels et d'échantillons désactivés ;
  - glisser-déposer du Kanban désactivé.
- La consultation et l'export CSV/XLSX restent possibles.
- Bandeau : « Votre période gratuite est terminée » + bouton de rendez-vous.
- Aucune donnée supprimée.

## 6. Compatibilité avant publication
Vérifications prévues par requêtes en base (sans rien modifier) :
- Aucun compte existant n'a de droit d'essai : tous les utilisateurs actuels restent en accès complet.
- Toutes les invitations existantes sont de type « classique » et gardent leur statut.
- Les nouvelles règles ne bloquent que les comptes en essai activé : comptes Free, abonnés et admins non concernés.
- La version actuellement en ligne fonctionne avec la base mise à jour : les colonnes ajoutées sont facultatives et les anciens statuts restent valides.

## 7. Procédure de test (à faire vous-même avec une adresse secondaire)
Je fournirai en fin de livraison :
- un CSV fictif de 5 lignes, dont un doublon ;
- une liste de vérification en 9 points, de l'invitation à la réimportation, en incluant les comptes Free, admin et abonnés.

Aucun email ne sera envoyé par moi pendant le développement.

## Hors périmètre
Aucun nouveau produit, tarif ou coupon Stripe. Aucun abonnement modifié. Le chantier de sécurité séparé n'est pas touché.
