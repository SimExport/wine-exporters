## Problème

L'erreur **"Cet email est déjà enregistré"** vient de `inviteUserByEmail` dans l'edge function `admin-invite-user`. Cette méthode Supabase échoue avec le code `email_exists` dès que l'utilisateur existe déjà dans `auth.users` — ce qui est toujours le cas lors d'un renvoi (la 1ère invitation a déjà créé le compte).

C'est aussi pourquoi tes 2 dernières tentatives sur `slemonnier57@gmail.com` apparaissent "Échouée" dans le journal : l'utilisateur a été créé lors de l'envoi 11:32:01, et toutes les invitations suivantes sont rejetées.

## Correctif

Modifier `supabase/functions/admin-invite-user/index.ts` :

1. Accepter un nouveau paramètre `mode: "invite" | "resend"` dans le body.
2. **Si `mode === "resend"`** → utiliser `admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } })` au lieu de `inviteUserByEmail`. Cela envoie un lien de connexion à l'utilisateur existant (mêmes templates Supabase).
3. **Si `mode` absent (premier envoi)** → garder `inviteUserByEmail`, mais en cas d'erreur `email_exists`, retomber automatiquement sur le magic link plutôt que d'échouer. Comme ça l'admin n'a plus besoin de supprimer manuellement l'utilisateur en base.
4. Le reste (vérif admin, log dans `admin_invitations`) reste identique.

## Côté front (`src/pages/AdminInvitations.tsx`)

Le bouton "Renvoyer" ajouté précédemment passe désormais `mode: "resend"` dans l'appel à l'edge function. Le formulaire principal reste sans `mode`.

## Résultat attendu

- Bouton "Renvoyer" → envoie un magic link à l'utilisateur existant, log "Envoyée" dans le journal.
- Premier envoi sur un email déjà inscrit → bascule auto sur magic link au lieu d'afficher l'erreur.
