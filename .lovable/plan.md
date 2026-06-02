## Problème

L'upload échoue avec "Bucket not found" car le bucket Supabase Storage `campaign-reports` n'a jamais été créé. La migration SQL initiale tentait un `INSERT INTO storage.buckets`, ce qui est interdit — il faut passer par l'outil dédié `supabase--storage_create_bucket`.

## Correction

1. **Créer le bucket** `campaign-reports` (public, pour permettre la lecture des rapports via URL publique) via `supabase--storage_create_bucket`.
2. **Vérifier les RLS policies** sur `storage.objects` :
   - SELECT public (lecture rapport via lien)
   - INSERT/UPDATE/DELETE réservés aux admins (`has_role(auth.uid(), 'admin')`)
   Si elles n'existent plus suite à la migration rejetée, les recréer.
3. **Retester l'upload** depuis `/admin/campaigns`.

Aucun changement de code applicatif n'est nécessaire — le hook d'upload pointe déjà vers le bon bucket.
