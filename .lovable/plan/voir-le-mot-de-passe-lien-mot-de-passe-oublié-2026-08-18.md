# Voir le mot de passe + lien « Mot de passe oublié »

## 1. Icône œil sur tous les champs mot de passe

Un petit bouton œil (Eye / EyeOff, lucide) à droite de chaque champ, qui bascule entre texte masqué et visible. Comportement identique partout, accessible au clavier avec un libellé « Afficher / Masquer le mot de passe » (FR/EN).

Champs concernés :
- Connexion (`/auth`) — mot de passe
- Créer son mot de passe (`/set-password`) — mot de passe + confirmation
- Réinitialiser (`/reset-password`) — mot de passe + confirmation
- Réglages → sécurité — mot de passe actuel, nouveau, confirmation

## 2. « Mot de passe oublié ? »

Aujourd'hui aucun écran ne permet de demander un lien de réinitialisation : la page `/reset-password` existe mais n'est atteignable que depuis un email généré manuellement.

Ajout :
- Un lien « Mot de passe oublié ? » sous le champ mot de passe de la page de connexion.
- Une page `/mot-de-passe-oublie` (alias `/forgot-password`) : un champ email, un bouton « Envoyer le lien », puis un message de confirmation neutre (« Si un compte existe pour cette adresse, un email vient d'être envoyé »), pour ne pas révéler quels emails sont inscrits.
- L'email renvoie vers `/reset-password`, qui gère déjà la création du nouveau mot de passe.

Note : l'envoi passe par le SMTP Supabase déjà configuré ; si la délivrabilité Resend pose problème, l'email de réinitialisation sera affecté de la même façon que les invitations.

## Détails techniques

- Nouveau composant `src/components/ui/password-input.tsx` : wrapper autour de `Input` avec bouton œil positionné en absolu, `type` piloté par un state local. Remplace les `Input type="password"` dans `Auth.tsx`, `SetPassword.tsx`, `ResetPassword.tsx`, `Settings.tsx`.
- Nouvelle page `src/pages/ForgotPassword.tsx` appelant `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`, route publique ajoutée dans `App.tsx`.
- Clés i18n ajoutées dans `src/i18n/locales/fr.json` et `en.json` (`auth.forgotPassword`, `auth.showPassword`, `auth.hidePassword`, textes de la page).
- Aucune modification de base de données ni d'Edge Function.
