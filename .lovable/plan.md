## Diagnostic

Le bouton « Télécharger » dans `/admin/users/:id` (onglet Documents) appelle `supabase.storage.from('documents').createSignedUrl(...)` côté navigateur. Le bucket `documents` est **privé** et ses policies RLS n'autorisent que le **propriétaire** du fichier à lire (`auth.uid()::text = (storage.foldername(name))[1]`).

Quand un admin consulte le profil d'un autre utilisateur, la signature est refusée par RLS → `createSignedUrl` renvoie une erreur → le toast « Impossible de générer le lien » s'affiche.

À noter : le bucket `media` est public (les téléchargements média fonctionnent via `<a download>`), et l'export ZIP fonctionne car il passe par l'Edge Function `admin-export-user-zip` (service role). Seuls les téléchargements unitaires de documents sont cassés pour les admins.

## Correctif

Ajouter une nouvelle migration qui crée une policy RLS sur `storage.objects` autorisant les admins (`has_role(auth.uid(), 'admin')`) à faire `SELECT` sur le bucket `documents`. Cela permet à `createSignedUrl` de réussir côté client pour un admin, sans toucher au code React.

```sql
CREATE POLICY "Admins can view all documents storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
```

## Hors scope

- Pas de changement de code front (`AdminUserProfile.tsx` reste tel quel).
- Pas de modification du bucket `media` ni de l'Edge Function ZIP.
- Pas d'élargissement des droits admin sur INSERT/UPDATE/DELETE storage.
