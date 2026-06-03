## Objectif

Dans `AdminCampaignReportUpload` (page `/admin/campaigns`), afficher l'email de chaque utilisateur à côté du nom de domaine / contact, pour différencier deux comptes avec le même nom (ex. `Château Paquette — Jérôme Paquette` × 2).

## Étapes

1. **Migration SQL** — créer une fonction `public.get_users_emails_for_admin()` :
   - `SECURITY DEFINER`, `STABLE`, retourne `TABLE(user_id uuid, email text)`.
   - Garde : `IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'`.
   - Lit `auth.users` (id, email) — accès limité aux admins uniquement.
   - `GRANT EXECUTE ... TO authenticated`.

2. **`src/components/admin/AdminCampaignReportUpload.tsx`** :
   - Au chargement, appeler `supabase.rpc('get_users_emails_for_admin')` en parallèle de la requête `profiles`.
   - Fusionner les deux par `user_id` dans `UserOption` (ajout d'un champ `email`).
   - Mettre à jour le rendu du `SelectItem` :  
     `{domain_name || contact_name || '—'} — {contact_name si dispo} · {email}`
   - L'email est affiché en `text-xs text-muted-foreground` pour rester lisible.
   - Trier la liste par `domain_name` puis `email`.

## Hors scope

- Pas de changement du flow d'upload ni de la notification email.
- Pas d'exposition des emails ailleurs dans l'app.
