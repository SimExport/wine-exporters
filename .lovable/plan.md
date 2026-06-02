## Problème

L’upload échoue avec `Bucket not found`, donc l’application appelle bien Supabase Storage, mais le bucket `campaign-reports` n’est pas présent dans le projet Supabase connecté.

## Ce qu’il faut faire

1. Créer le bucket Storage `campaign-reports` dans Supabase.
2. Le rendre public pour que les rapports puissent être consultés via une URL.
3. Ajouter les policies RLS sur `storage.objects` :
   - lecture publique des fichiers du bucket ;
   - upload/modification/suppression réservés aux admins.
4. Retester l’upload depuis `/admin/campaigns`.

## De ton côté

Tu n’as normalement rien à faire manuellement si tu me laisses l’implémenter : j’utiliserai les outils Supabase du projet pour créer le bucket et les policies.

Si tu veux le faire à la main dans Supabase :

1. Va dans Supabase → Storage → New bucket.
2. Nom exact : `campaign-reports`.
3. Coche Public bucket.
4. Ajoute ensuite des policies sur `storage.objects` pour autoriser l’admin à uploader.

## Point important

La migration SQL précédente n’a visiblement pas créé le bucket, probablement parce que les buckets Storage doivent être créés via l’API Storage native, pas via une migration SQL sur `storage.buckets`. Je corrigerai donc ça en utilisant la bonne méthode.