# Correction téléchargement documents (admin)

Le bucket `documents` est privé : les `file_url` publics renvoient 404. Il faut générer des URLs signées côté admin.

## `src/pages/AdminUserProfile.tsx`
- Ajouter un helper `getSignedDocUrl(file_url)` qui extrait le chemin après `/documents/` et appelle `supabase.storage.from('documents').createSignedUrl(path, 3600)`.
- Remplacer les liens directs `<a href={d.file_url} download>` par un bouton qui :
  - génère l'URL signée à la volée,
  - ouvre l'URL dans un nouvel onglet (téléchargement).
- Bouton "Copier le lien" : copier l'URL signée fraîchement générée (valide 1h) au lieu de `file_url`.
- Pour les `media` (bucket public) : conserver les liens directs, ils fonctionnent déjà.

## `supabase/functions/admin-export-user-zip/index.ts`
- Pour les documents privés : remplacer `fetch(file_url)` par `supabase.storage.from('documents').download(path)` (service role, contourne RLS).
- Extraire le chemin via split sur `/documents/` ou `/object/public/documents/`.
- Pour les médias publics : garder `fetch` (ou aussi passer par `storage.download` pour cohérence).

## Hors périmètre
- Pas de changement de visibilité du bucket (reste privé pour confidentialité client).
- Pas de migration des `file_url` existants.
