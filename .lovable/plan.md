## Problème

Les utilisateurs invités (ex. Pierre Manceau, Bernhard Backhaus) ont bien `user_roles.role = 'paid'` (mis par le trigger `handle_new_user_role`), mais leur `profiles.subscription_plan` reste à `'none'`.

Or le hook `useSubscription` (qui détermine `hasPaidAccess` utilisé pour /importers, recherches sur‑mesure, etc.) se base **uniquement** sur `profiles.subscription_plan`, jamais sur `user_roles.role`. Résultat : 14 utilisateurs actuellement bloqués alors qu'ils devraient avoir accès.

## Correctifs

### 1. Frontend — `src/hooks/useSubscription.tsx`
- Lire aussi le rôle via `useRole` (déjà importé) et considérer `role === 'paid'` comme accès payant.
- `hasPaidAccess = isAdmin || role === 'paid' || tier === 'paid'`
- `isFreeUser` ajusté en conséquence.
- `canLaunchCampaign` inchangé hormis la nouvelle source de `hasPaidAccess`.

### 2. Frontend — `src/hooks/useRole.tsx`
- Étendre le type `AppRole` à `'admin' | 'user' | 'free' | 'paid'` pour refléter l'enum DB réel.
- Pas d'autre changement de logique.

### 3. Backend — migration SQL
- Backfill : pour tous les `user_roles.role = 'paid'` dont le profil a `subscription_plan` NULL ou `'none'`, mettre `subscription_plan = 'paid'` (cohérence + permet à `has_paid_access` SQL de fonctionner aussi).
- Mettre à jour le trigger `handle_new_user_role` : quand l'utilisateur est invité, en plus d'insérer le rôle `'paid'`, mettre à jour `profiles.subscription_plan = 'paid'` pour ce user_id (UPSERT après le trigger `handle_new_user` qui crée déjà la ligne profile).

### 4. Vérification
- Recharger l'app en tant qu'un des utilisateurs concernés (ou requête SQL) pour confirmer que `hasPaidAccess` renvoie true et que /importers + sourcing sont accessibles.

## Hors scope
- Aucun changement Stripe / webhook / facturation.
- Aucun changement UI à part le déblocage automatique.
