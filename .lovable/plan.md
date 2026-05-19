## Problème

Dans `AdminCampaigns.tsx`, valider/rejeter une campagne fait un `UPDATE` direct sur la table `campaigns`. Mais la seule policy RLS UPDATE est :

```
Users can update their own campaigns
USING (auth.uid() = user_id)
```

Il n'existe **aucune policy admin** pour UPDATE sur `campaigns`. Quand un admin valide une campagne d'un autre utilisateur (ex. Château Paquette), PostgREST filtre la ligne via RLS, retourne 0 ligne modifiée **sans erreur**, le toast "Campagne validée" s'affiche, mais en base le statut reste `pending_validation`.

C'est ce qu'on voit sur ta capture Supabase : `Campagne mai 2026` (user `dbe2aec5…`) est restée `pending_validation` alors que ton compte admin a cliqué Valider.

## Correctif

Ajouter une policy RLS admin sur `campaigns` pour UPDATE (et DELETE pour cohérence avec le reste de l'admin) :

```sql
CREATE POLICY "Admins can update any campaign"
ON public.campaigns
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

Aucun changement de code applicatif requis — `validateCampaign` et `rejectCampaign` fonctionneront immédiatement.

## Vérification post-fix

1. Re-valider la campagne Château Paquette depuis `/admin/campaigns`.
2. Confirmer dans Supabase que `status = 'active'` et `validated_at` est rempli.
3. Tester aussi le rejet (passage en `failed` + `client_note`).
