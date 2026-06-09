# Changement d'email d'un user par l'admin

## Objectif

Permettre à un admin de modifier l'adresse email d'un utilisateur existant **sans recréer le compte**. Le user conserve son `user_id`, son mot de passe, ses campagnes, leads, crédits, abonnement Stripe et tout son historique.

Cas immédiat : `Erlande8@hotmail.com` → `contact@champagnecordeuil-perefille.com`.

## Ce qui sera construit

### 1. Edge Function `admin-change-user-email`

Nouvelle fonction sécurisée qui :
- Vérifie que l'appelant est bien admin (via `user_roles`)
- Valide le format de la nouvelle adresse
- Vérifie qu'aucun autre user n'utilise déjà cette adresse
- Appelle `supabase.auth.admin.updateUserById(userId, { email, email_confirm: true })` → changement immédiat, sans email de confirmation envoyé au user
- Met à jour en parallèle l'email du customer Stripe (si `stripe_customer_id` présent sur le profil) pour que les factures partent à la bonne adresse
- Met à jour le contact dans l'audience Resend (suppression de l'ancien email, ajout du nouveau)
- Journalise l'opération dans `admin_invitations` ou un log similaire pour traçabilité

### 2. UI dans `/admin/users`

Sur chaque ligne du tableau utilisateurs, ajout d'un bouton discret (icône crayon à côté du nom) qui ouvre un dialog :

```text
┌─────────────────────────────────────────┐
│ Changer l'email de John Doe             │
├─────────────────────────────────────────┤
│ Email actuel : erlande8@hotmail.com     │
│                                         │
│ Nouvel email :                          │
│ ┌─────────────────────────────────────┐ │
│ │ contact@champagne...                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠ Le user pourra immédiatement se      │
│ connecter avec la nouvelle adresse.     │
│ Son mot de passe reste inchangé.        │
│                                         │
│         [Annuler]    [Confirmer]        │
└─────────────────────────────────────────┘
```

Le tableau affichera désormais aussi l'email actuel (récupéré via la fonction RPC existante `get_users_emails_for_admin`) — aujourd'hui seul le `display_name` est visible, ce qui complique l'identification.

### 3. Exécution immédiate pour Erlande8

Une fois la fonction déployée et l'UI en place, tu pourras :
- aller dans `/admin/users`
- rechercher `Erlande8`
- cliquer sur le bouton crayon, taper `contact@champagnecordeuil-perefille.com`, confirmer

Résultat immédiat : connexion possible avec la nouvelle adresse, ancien lien Stripe préservé, factures envoyées au bon endroit.

## Détails techniques

**Fichiers créés / modifiés :**
- `supabase/functions/admin-change-user-email/index.ts` (nouveau)
- `src/pages/AdminUsers.tsx` (ajout colonne email + bouton + dialog)
- `src/components/admin/ChangeUserEmailDialog.tsx` (nouveau)
- `src/i18n/locales/fr.json` + `en.json` (libellés admin)

**Sécurité :**
- Edge function vérifie `has_role(auth.uid(), 'admin')` avant toute action
- Vérification anti-doublon sur l'email cible avant `updateUserById`
- Aucun secret côté front : la clé service_role reste dans l'edge function

**Side-effects gérés :**
- Stripe customer email (uniquement si `stripe_customer_id` existe)
- Resend audience : `DELETE /audiences/{id}/contacts/{old_email}` + `POST` du nouveau
- Pas de changement nécessaire dans `profiles`, `user_settings`, `user_roles`, `campaigns`, `leads`, etc. — tous joints par `user_id` qui ne bouge pas

**Ce qui ne change pas :**
- Mot de passe utilisateur
- `user_id`
- Toutes les données métier (campagnes, leads, crédits, sourcing, CRM…)
- Abonnement Stripe actif

## Hors scope

- Pas d'historique des changements d'email (peut être ajouté plus tard)
- Pas de notification email au user pour l'informer du changement (à demander si souhaité)
- Pas d'UI self-service côté user dans `/settings` (Option 2 du message précédent, non retenue)
