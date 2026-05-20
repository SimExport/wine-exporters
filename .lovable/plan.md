## Diagnostic

Les deux comptes mentionnés (`pierre@chai-bm.com`, `contact@chateau-de-france.com`) ont bien :
- rôle `free`, `subscription_plan = 'none'`
- `campaign_credits = 1`, `search_credits = 1` ✅

Les crédits sont donc déjà correctement attribués aux nouveaux inscrits (valeurs par défaut de `user_credits`).

Le blocage sur `/importers` vient de **deux verrous** qui exigent un abonnement payant :

1. **Frontend** — `src/pages/Importers.tsx` ligne 285 : `if (!hasPaidAccess)` → affiche `PremiumOnlyState`. `hasPaidAccess` (dans `useSubscription`) ne passe à `true` que si l'utilisateur est admin ou a `subscription_plan = 'paid'`.
2. **Base de données** — Les deux policies RLS sur `buyer_contacts` (`Paid users access buyer_contacts` et `Paid users and admins can view buyer contacts`) restreignent le SELECT à `get_user_role = paid/admin` ou `has_paid_access`. Même en retirant le verrou frontend, les requêtes renverraient 0 ligne.

## Plan

### 1. Migration Supabase — ouvrir la lecture de `buyer_contacts` aux utilisateurs authentifiés

```sql
DROP POLICY "Paid users access buyer_contacts" ON public.buyer_contacts;
DROP POLICY "Paid users and admins can view buyer contacts" ON public.buyer_contacts;

CREATE POLICY "Authenticated users can view buyer contacts"
ON public.buyer_contacts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
```

### 2. `src/pages/Importers.tsx` — retirer le gate `PremiumOnlyState`

- Supprimer le bloc `if (!hasPaidAccess) { return <PremiumOnlyState ... /> }` (lignes ~285–294).
- Garder le `subscriptionLoading` (spinner initial) ou le retirer aussi puisque non bloquant.
- Supprimer l'import inutilisé `PremiumOnlyState` si plus utilisé ailleurs dans le fichier.
- Conserver `hasPaidAccess` uniquement pour les boutons conditionnels existants (ligne 308) ou simplifier au besoin.

La feature "Recherche sur-mesure" reste protégée naturellement par `searchCredits <= 0` (qui affiche déjà un message dédié), donc inchangée.

### 3. Vérification

- Recharger `/importers` connecté en tant que `pierre@chai-bm.com` → la liste pays + tableau doivent s'afficher.
- Vérifier qu'un nouvel inscrit reçoit toujours 1 crédit campagne + 1 crédit recherche (déjà OK via défauts de `user_credits`).

## Hors scope

- Pas de changement des crédits par défaut (déjà à 1/1).
- Pas de changement sur les autres verrous payants (campagnes, etc.).
- Pas de modification de la page LP / pricing.
