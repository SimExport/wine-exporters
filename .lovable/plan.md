# Passerelle ExportVins → WineExporters (essai CRM 30 jours)

Légende : **[V1]** indispensable à la première mise en production, **[Plus tard]** reportable.

## 1. Base de données

**Nouvelle table `user_entitlements`** [V1] : un droit en plus du rôle, sans toucher à l'enum `app_role` ni à Stripe.
- `user_id`, `entitlement` (`'exportvins_crm_trial'`), `status` (`invited` | `active` | `expired` | `converted` | `revoked`)
- `mission_name`, `invited_at`, `activated_at`, `expires_at` (activation + 30 j), `grace_ends_at` (expiration + 7 j)
- `discount_eligible` (booléen, tarif 99 €), `invited_by`, `notified_d25_at`, `notified_d30_at`, `notified_d37_at`
- Unique (`user_id`, `entitlement`). Lecture : l'utilisateur voit sa propre ligne. Écriture : admin uniquement (aucune écriture utilisateur, donc pas de prolongation possible).

**Fonctions serveur** [V1] :
- `crm_access_level(uid)` → `full` | `trial` | `readonly` | `none`. Abonné ou admin → `full` (l'essai n'est jamais pris en compte). Essai actif → `trial`. Période de 7 jours → `readonly`. Sinon → règle actuelle inchangée pour les Free standards.
- `has_premium_access(uid)` → vrai pour abonnés et admins seulement.
- `activate_exportvins_trial()` : appelée à la première connexion ; passe `invited` → `active`, fixe `activated_at`, `expires_at`, `grace_ends_at`. Ne fait rien si déjà actif ou si l'utilisateur est abonné.

**Colonnes sur `leads`** [V1] : `mission_name` (texte), `import_key` (texte, unique par utilisateur) pour l'import sans doublons. La source réutilise `source = 'exportvins_mission'`.

**Règles d'accès côté serveur** [V1], ajoutées sans retirer les corrections de sécurité en cours :
- `leads`, `prospect_notes`, `sample_items` : création/modification refusées si `crm_access_level = 'readonly'` ou `'none'` pour un compte en essai ; lecture refusée après la période de 7 jours.
- `importer_requests`, `tender_requests`, `buyer_contacts` : lecture refusée aux comptes en essai (pas aux Free standards, sauf validation séparée).
- `consume_search_credit`, `consume_export_credits` (base importateurs), `consume_campaign_credit` : refus pour les comptes en essai.
- Edge Functions `create-campaign`, `process-sourcing-request`, `notify-sourcing-submission` : vérification `has_premium_access` pour les comptes en essai.

## 2. Code à modifier

- **Nouveau hook `useCrmAccess`** [V1] : lit le droit + `useSubscription`, expose `level`, `daysLeft`, `isTrial`, `isReadonly`, `discountEligible`.
- **`AppSidebar` / `MobileNav`** [V1] : toutes les rubriques restent visibles ; petit cadenas sur Opportunités, Importateurs, Campagnes, Recherches pour les comptes en essai.
- **Pages premium** [V1] : `Opportunities`, `Importers`, `Campaigns`, `CreateCampaign`, `CampaignDetail`, `SourcingRequests` affichent un nouveau composant `PremiumFeaturePreview` **avant tout chargement de données** (aucune requête lancée, donc rien de protégé n'arrive dans le navigateur).
- **CRM** (`CRM`, `Pipeline`, `Prospects`, `ProspectDetail`, `ReminderPopover`) [V1] : bandeau d'essai, accueil Mission, mode lecture seule (boutons d'édition désactivés), écran de fin après 7 jours.
- **Redirection** [V1] : `AuthenticatedApp` et `Dashboard` envoient les comptes en essai vers `/pipeline`.
- **Export CRM** [V1] : vérifier que l'export CSV/XLSX des prospects reste possible en essai et en lecture seule, sans consommer de crédits d'export base importateurs.
- **Admin** : nouvelle page `/admin/exportvins` [V1] + bloc dans `AdminUserProfile` [Plus tard].
- **Edge Functions** : `admin-exportvins-invite` [V1], `exportvins-trial-lifecycle` (cron quotidien) [V1], `create-checkout` adapté pour le 99 € [V1, après création du tarif], `send-daily-reminders` filtré [V1].

## 3. Pages de présentation premium

Un seul composant réutilisable, 4 contenus FR/EN (Opportunités, Base importateurs, Campagnes, Recherches) :
- Titre et phrase de valeur, 3 bénéfices avec icônes, mention « Réservé aux abonnés WineExporters ».
- Encart offre : « 99 € HT/mois au lieu de 199 € HT/mois » (si éligible), bouton « Débloquer WineExporters » vers `/billing`.
- Illustration générique, aucune donnée réelle. Design existant (Caacupé One, DM Sans, #59191F, crème, or), ton non agressif.

## 4. CRM pour les comptes en essai

- **Accueil** (affiché tant que non fermé) : « Bienvenue sur WineExporters ! » + texte fourni + 5 actions recommandées, sans créer de fausses actions ni de rappels.
- **Bandeau discret** : « Votre accès CRM offert avec ExportVins : encore X jours disponibles. » + lien « Découvrir WineExporters ».
- Toutes les fonctions existantes : pipeline, statuts, notes, échantillons, rappels, suivi commercial, export.
- Filtre « Mission ExportVins » via la source et le nom de mission.

## 5. Import CSV de mission (admin)

Page `/admin/exportvins` → « Importer une mission ExportVins » :
1. Choisir l'utilisateur, saisir le nom de la mission.
2. Déposer un CSV (séparateur `;` ou `,`, UTF-8), correspondance automatique des colonnes : société, pays, contact, email, téléphone, site, adresse, cuvées, commentaires, étape, prochaine action.
3. Aperçu avec statut par ligne : nouveau / déjà présent / incomplet. Étape par défaut « Échantillons à envoyer », modifiable.
4. Validation → création des fiches dans une campagne système **« Mission ExportVins – {nom} »** (`status = 'manual'`, même principe que « Prospects manuels », donc ni envoi ni statistiques). Création de l'étape pipeline si absente chez l'utilisateur.
5. Sans doublons : `import_key` = mission + email (ou mission + société + pays si pas d'email) ; un second import met seulement à jour les champs vides.
6. Récapitulatif : X créés, Y ignorés, Z en erreur. Champs manquants laissés vides.

Les contacts ne sont importés qu'après acceptation de l'invitation par le domaine.

## 6. Invitation et administration

Page `/admin/exportvins` [V1] : recherche utilisateur, indication s'il est déjà abonné, statut (invitation en attente / essai actif / lecture seule / expiré / abonné), dates, bouton « Renvoyer l'invitation », accès à l'import.
- **Nouveau domaine** : réutilise le mécanisme d'invitation existant (`admin-invite-user`) mais sans donner le rôle `paid`.
- **Compte existant** : email d'invitation avec lien vers `/auth` ; l'essai démarre à la première connexion après invitation, jamais deux comptes.
- **Déjà abonné** : l'admin peut importer les contacts, l'essai n'est pas créé (aucun droit écrasé).

## 7. Expiration et emails

Cron quotidien `exportvins-trial-lifecycle` (Resend, langue de l'utilisateur, envoi unique grâce aux dates `notified_*`) :
- **J+25** : fin d'accès dans 5 jours.
- **J+30** : passage en lecture seule, proposition 99 € ou export.
- **J+37** : fin de la récupération, CRM fermé, **aucune donnée supprimée**.
- Abonné entre-temps → statut `converted`, aucun email, accès complet sans interruption.
- `send-daily-reminders` : plus de rappels pour les comptes en lecture seule ou expirés.
- Politique de conservation/suppression : à définir avec vous avant la mise en production [Plus tard].

## 8. Tarif 99 €

- Éligibilité stockée en base (`discount_eligible`), modifiable uniquement par un admin.
- `create-checkout` choisit lui-même le tarif côté serveur selon l'éligibilité ; le navigateur n'envoie jamais de prix.
- Le webhook Stripe existant débloque le premium après confirmation de paiement ; 199 € et abonnements actuels inchangés.
- **Le produit/tarif Stripe 99 € ne sera créé qu'après votre accord explicite.** En attendant, le bouton mène à `/billing` standard.

## 9. Risques de régression

- Règles d'accès sur `leads` : risque de bloquer abonnés ou admins → toujours `full` pour eux, testé en premier.
- Modifs des pages Opportunités/Importateurs : ne s'appliquent qu'aux comptes en essai.
- Rôle `paid` donné automatiquement aux invités : l'invitation ExportVins doit utiliser un chemin séparé.
- Campagnes système de mission : à exclure des listes de campagnes, statistiques et tableau de bord (comme « Prospects manuels »).
- Rappels quotidiens : le filtre ne doit pas toucher les autres utilisateurs.
- Conflit avec le chantier sécurité : nouvelles règles ajoutées, aucune règle existante supprimée.

## 10. Plan de test

| Scénario | Free standard | Essai ExportVins | Abonné | Admin |
|---|---|---|---|---|
| Arrivée après connexion | Dashboard | CRM + accueil | Dashboard | Dashboard |
| CRM création/édition | Inchangé | Oui (J0-J30), lecture seule (J30-J37), fermé ensuite | Oui | Oui |
| Opportunités | Inchangé | Présentation seule, aucune donnée chargée (vérifié dans le réseau) | Oui | Oui |
| Importateurs / Campagnes / Recherches | Inchangé | Présentation ; appels directs refusés par le serveur | Oui | Oui |
| Export CRM | Inchangé | Oui jusqu'à J+37 | Oui | Oui |
| Tarif 99 € | Refusé | Proposé si éligible | — | — |
| Emails J25/J30/J37 | Aucun | Un seul de chaque | Aucun | — |
| Import CSV | — | — | — | Aperçu, doublons, second import sans doublon |

Tests serveur directs (appels API sans l'interface) avec un compte en essai pour chaque table et fonction protégée, ainsi que tests automatisés des règles de dates (30 j, 7 j, conversion).

## Ordre de livraison proposé

1. Base de données + règles serveur + `useCrmAccess`.
2. Page admin + invitation + import CSV.
3. CRM dédié (accueil, bandeau, lecture seule) + pages de présentation.
4. Cron d'expiration + emails.
5. Tarif 99 € (après votre accord sur Stripe).
