# Invitation non reçue : diagnostic et solution de secours

## Ce qui est confirmé

- Le compte `david@alchemywines.co.uk` existe, a bien été invité aujourd'hui, n'a jamais été confirmé ni connecté.
- La ligne correspondante dans le journal d'invitations est au statut « Envoyée » (aucune erreur retournée par l'API Auth).
- La capture montre que le SMTP personnalisé Supabase est activé, via Resend, expéditeur `team@exportvins.fr`.

Conséquence : l'email d'invitation est bien parti vers Resend. Le point non vérifié est ce que Resend en a fait (accepté, bounce, blocage par le serveur destinataire). Les logs Auth Supabase ne sont plus consultables (rétention de quelques minutes) et l'app n'interroge aujourd'hui l'API Resend que pour les contacts, jamais pour l'état de livraison.

## Étape 1 — Vérification (aucun code)

Ouvrir Resend → Logs, filtrer sur `david@alchemywines.co.uk` pour la période 09:59 UTC du 18/08. Trois cas possibles :
- `delivered` → l'email est arrivé, il est en spam/quarantaine chez lui.
- `bounced` / `complained` → adresse ou serveur destinataire refusant le message.
- absent → l'envoi SMTP n'a pas atteint Resend (identifiants SMTP ou domaine non vérifié).

Vérifier aussi Resend → Domains que `exportvins.fr` est bien « Verified » (SPF + DKIM).

## Étape 2 — Solution de secours dans l'app

Quel que soit le résultat, il faut pouvoir débloquer un utilisateur sans dépendre de l'email. Ajout d'une action « Copier le lien d'invitation » dans le journal d'invitations admin :

- L'admin clique sur l'icône lien d'une ligne, l'app génère un lien de création de mot de passe valable et le copie dans le presse-papier.
- L'admin transmet ce lien par le canal qu'il veut (email perso, WhatsApp, téléphone).
- Aucun email n'est envoyé lors de cette action.

## Étape 3 — Visibilité de la livraison (optionnel, à confirmer)

Afficher dans le journal d'invitations le statut réel de livraison Resend (Delivered / Bounced / Spam) à côté du statut « Envoyée », pour ne plus avoir à ouvrir le dashboard Resend à chaque incident.

## Détails techniques

- Nouvelle Edge Function `admin-invite-link` : vérifie le rôle admin comme `admin-invite-user`, puis appelle `admin.auth.admin.generateLink({ type: 'invite' | 'recovery', email, options: { redirectTo: '<origine>/set-password' } })` et renvoie uniquement `properties.action_link`. Pas d'envoi d'email. `verify_jwt = true` dans `supabase/config.toml`.
- `src/pages/AdminInvitations.tsx` : nouveau bouton icône par ligne à côté de « Renvoyer », qui invoque la fonction et copie le lien (toast de confirmation). Choix automatique du type : `invite` si le compte n'est pas confirmé, `recovery` sinon.
- Étape 3 si retenue : Edge Function `admin-email-delivery` interrogeant l'API Resend (`RESEND_API_KEY` déjà configurée) et badge de statut dans le tableau.
- Aucune modification de schéma, aucune autre page touchée.

## Sécurité

Le lien généré donne accès au compte cible : il n'est retourné qu'aux admins authentifiés, jamais journalisé côté serveur, et n'est pas stocké en base.
