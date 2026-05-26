# Correction du système de rôles utilisateurs

## Diagnostic

Deux problèmes liés, même cause racine.

**1. Les invités arrivent en `free`**
Le trigger `handle_new_user_role` (sur `auth.users`) insère systématiquement `'free'` à la création du compte, sans distinguer un inscrit "libre" d'un utilisateur invité par l'admin.

**2. Impossible de passer ces deux users en `paid` ("already exists")**
La table `user_roles` a une contrainte d'unicité sur `(user_id, role)` — pas sur `user_id` seul. Les deux users concernés ont **déjà deux lignes** chacun :

| user | rôles présents |
|---|---|
| domaine.echelette@orange.fr | `free` + `paid` |
| jerome@paquette.fr | `free` + `paid` |

Quand tu édites la ligne `free` pour la passer à `paid` dans Supabase, la contrainte `(user_id, 'paid')` est déjà prise → erreur 23505. La ligne `paid` existe déjà, il faut juste **supprimer la ligne `free`** orpheline.

Ces doublons viennent du flux historique : le trigger crée `free` à l'inscription, puis `stripe-webhook` / `check-subscription` font un `INSERT` au lieu d'un `UPDATE` quand l'abonnement est activé.

## Plan d'action

### 1. Migration BDD

- **Nettoyer les doublons existants** : pour tout `user_id` ayant à la fois `free` et `paid` (ou `admin`), supprimer la ligne `free`.
- **Remplacer la contrainte d'unicité** `(user_id, role)` par une contrainte sur `user_id` seul → un user = un seul rôle. Cela rend impossible toute nouvelle duplication.
- **Mettre à jour le trigger `handle_new_user_role`** : à la création d'un compte, vérifier si l'email figure dans `admin_invitations` (status `sent`). Si oui → insérer `'paid'`. Sinon → `'free'`. Ajouter `ON CONFLICT (user_id) DO NOTHING`.

### 2. Edge functions (code)

- **`stripe-webhook/index.ts`** : remplacer la logique check-then-insert/update par un simple `UPDATE ... SET role='paid' WHERE user_id=...`, et `INSERT ... ON CONFLICT (user_id) DO UPDATE` en fallback. Idem pour le downgrade vers `free`.
- **`check-subscription/index.ts`** : même refactor → UPSERT au lieu de check + insert.

### 3. Frontend

- **`src/hooks/useRole.tsx`** : remplacer `.single()` par `.maybeSingle()` pour éviter une erreur si jamais 0 ou plusieurs lignes existent (ceinture + bretelles).

## Détails techniques

SQL clé de la migration :

```sql
-- Nettoyage
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.role = 'free'
  AND b.role IN ('paid','admin');

-- Nouvelle contrainte
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Trigger mis à jour
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  is_invited boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_invitations
    WHERE lower(email) = lower(NEW.email)
      AND status = 'sent'
  ) INTO is_invited;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_invited THEN 'paid'::public.app_role
                       ELSE 'free'::public.app_role END)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

## Résultat attendu

- Les deux users concernés passent automatiquement en `paid` (la ligne `free` est supprimée).
- Tout nouvel utilisateur invité depuis Admin → Invitations arrive directement en `paid`.
- Plus aucun risque de doublon (contrainte sur `user_id`).
- Les webhooks Stripe restent cohérents (upgrade/downgrade fonctionnent).
