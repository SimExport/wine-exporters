# Invitations ExportVins : un seul formulaire, un seul bouton

## Ce que vous verrez
Sur `/admin/invitations`, un choix en haut du formulaire :
- **Invitation classique WineExporters** : rien ne change.
- **Client ExportVins — Mission Performance** : formulaire unique avec
  - email du client, nom du domaine, nom de la mission ;
  - dépôt du CSV des importateurs ;
  - case « Tarif privilégié WineExporters 99 € HT/mois », cochée par défaut.
- Dès le dépôt du fichier : aperçu simple, avec X importateurs valides, Y doublons et Z lignes en erreur (avec la raison).
- Un seul bouton : **« Créer l'accès CRM et envoyer l'invitation »**.
- Confirmation finale : « 23 prospects intégrés au CRM de {domaine}, invitation envoyée ».
- Journal : nouvelle colonne Type. Pour ExportVins : domaine, mission, statut (en attente, essai actif, lecture seule, expiré, abonné), début et fin des 30 jours.

## Ce qui se passe au clic (côté serveur, dans cet ordre)
1. L'invitation est enregistrée avec le type `exportvins`.
2. Si l'email existe déjà, son compte est réutilisé. Sinon, le compte est créé **sans envoyer d'email** et sans rôle `paid`.
3. Le droit d'essai est créé en attente, sans date de début, seulement si le compte n'est pas déjà abonné ou admin. Un essai déjà démarré n'est jamais prolongé ni redémarré.
4. Les contacts sont importés **directement dans le CRM du compte**, dans « Mission ExportVins – {mission} ».
   - Les doublons sont ignorés grâce à la clé mission + email, ou mission + société + pays.
   - Les fiches déjà présentes ne sont jamais écrasées.
   - Le nombre de contacts rattachés est ensuite vérifié.
5. L'email d'invitation part **uniquement si les étapes 1 à 4 ont réussi**. C'est un lien Supabase vers la création du mot de passe.
6. À la première connexion, les 30 jours démarrent et le CRM est déjà rempli : les contacts sont en place avant l'envoi, sans transfert à attendre.

Comme le compte est créé avant l'import, la table d'attente `exportvins_pending_leads` n'est plus nécessaire. C'est la solution la plus simple et la plus robuste.

## Sécurité des rôles
- Le déclencheur `handle_new_user_role` donne `paid` uniquement pour les invitations `classic`.
- `admin-invite-user` en mode ExportVins ne touche ni au rôle, ni à `subscription_plan`, ni à Stripe.
- Un abonné, un admin ou une adresse ayant déjà reçu une invitation classique garde ses droits. Seuls les contacts de la mission lui sont ajoutés.
- Deuxième mission : nouveaux contacts ajoutés, sans doublons, essai inchangé. L'éligibilité au tarif 99 € reste valable après l'expiration.

## Changements techniques
- Base de données :
  - `admin_invitations` reçoit `invitation_type` (`classic` par défaut), `domain_name` et `mission_name` ;
  - le déclencheur des rôles filtre sur le type `classic` ;
  - `leads` utilise les colonnes `mission_name` et `import_key` déjà créées.
- Edge Function `admin-invite-user` : nouvelle branche `type: 'exportvins'` qui reçoit les lignes CSV déjà analysées (500 au maximum, validées côté serveur). La branche classique reste inchangée.
- `AdminInvitations.tsx` : sélecteur de type, champs, lecture du CSV (`;` ou `,`, UTF-8, colonnes FR/EN reconnues automatiquement), aperçu et colonnes du journal.
- Étape par défaut des contacts : « Échantillons à envoyer », créée dans le pipeline de l'utilisateur si elle n'existe pas.

## Tests (aucune invitation réelle, aucun compte pour Juliette Avril)
- En base, avec des comptes fictifs supprimés ensuite :
  - invitation classique (toujours `paid`) ;
  - invitation ExportVins pour un nouveau compte (pas de `paid`, essai en attente) ;
  - compte Free existant ;
  - compte abonné (aucun essai, contacts ajoutés) ;
  - activation (30 jours qui démarrent) ;
  - deuxième import (pas de doublon, pas de prolongation) ;
  - lecture seule à J+30 et fermeture à J+37, en simulant les dates ;
  - accès direct aux opportunités et à la base importateurs refusé.
- L'email n'est jamais envoyé pendant les tests : la fonction est testée avec une option « sans envoi » réservée aux tests.
- Les tests connectés à l'écran ne sont pas possibles depuis mon environnement. Je vous fournirai une liste de vérification courte à faire avec un email de test.
