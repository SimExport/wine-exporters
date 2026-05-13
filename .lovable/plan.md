## Audit du flux d'invitation

### Ce qui est en place et fonctionne

1. **Page admin** (`AdminInvitations.tsx`) — formulaire envoie l'email à l'Edge Function `admin-invite-user`, avec `redirectTo = https://wine-exporters.com/set-password` (forcé sur la prod même quand on déclenche depuis le preview).
2. **Edge Function `admin-invite-user`** — vérifie le JWT, vérifie que l'appelant est `admin`, puis :
   - 1er envoi → `auth.admin.inviteUserByEmail(email, { redirectTo })`
   - Renvoi (`mode: "resend"`) ou email déjà existant → bascule sur `signInWithOtp` (magic link), ce qui est correct car l'utilisateur existe déjà.
   - Loggue tout dans `admin_invitations` (sent / failed + message d'erreur).
3. **Page `/set-password`** — déclarée dans `App.tsx`, lit le hash `#access_token & refresh_token`, ouvre la session, puis `supabase.auth.updateUser({ password })` → redirection vers `/dashboard`.
4. **Triggers** — à la création de l'utilisateur, `handle_new_user`, `handle_new_user_role`, `handle_new_user_credits`, `handle_new_user_settings` créent profile + role free + crédits + settings. OK.
5. **Email** — pas de domaine email Lovable configuré → Supabase envoie son template par défaut "You have been invited" (bouton "Accept the invite") qui pointe vers `redirectTo`. Fonctionnel.

### Points d'attention (à vérifier côté dashboard Supabase, pas dans le code)

A. **Redirect URLs autorisées** — dans Supabase → Authentication → URL Configuration, il faut que ces URLs soient dans la liste « Redirect URLs » :
   - `https://wine-exporters.com/set-password`
   - `https://wine-exporters.lovable.app/set-password`
   Sinon le lien dans l'email retombe sur la Site URL et le SetPassword ne reçoit pas les tokens.

B. **Rate limit Supabase** — l'historique montre déjà des erreurs « For security purposes, you can only request this after 26 seconds » et « email rate limit exceeded ». Pour 2 invitations espacées, aucun souci ; mais éviter de spammer le bouton « Renvoyer ».

### Petit bug latent à corriger dans `/set-password`

La page ne gère que le format **implicit** (`#access_token=...`). Selon la version du template d'email Supabase, le lien peut arriver en **PKCE** (`?code=...`) ou bien expirer côté Supabase et être recyclé. On rend la page robuste aux deux formats :

- Si l'URL contient `?code=...` → appeler `supabase.auth.exchangeCodeForSession(code)`.
- Sinon, garder le comportement actuel (hash tokens).
- Nettoyer l'URL après.

Cela évite le « Lien invalide ou expiré » sur certains comptes / certains clients mail qui pré-fetchent le lien.

### Plan d'action

1. **Code** : durcir `src/pages/SetPassword.tsx` pour gérer aussi le flow PKCE (`?code=...`) avec `exchangeCodeForSession`.
2. **Vérification manuelle** que vous (admin) faites avant l'envoi réel :
   - Confirmer dans Supabase Auth que les deux Redirect URLs ci-dessus sont bien autorisées.
   - Faire un test end-to-end avec une adresse à vous : invitation → réception mail → clic → page SetPassword → mot de passe défini → connexion.
3. **Aucun changement** côté Edge Function `admin-invite-user` (logique correcte) ni côté `AdminInvitations.tsx`.

### Détails techniques

```ts
// SetPassword.tsx — init() devient :
const url = new URL(window.location.href);
const code = url.searchParams.get("code");
if (code) {
  await supabase.auth.exchangeCodeForSession(code);
  window.history.replaceState(null, "", url.pathname);
} else {
  const params = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
    window.history.replaceState(null, "", window.location.pathname);
  }
}
// puis getSession() comme aujourd'hui
```

Aucune modification de DB, ni de policies, ni de secrets.
