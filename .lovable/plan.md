## Problème

L'upload d'une vidéo de 150 Mo échoue avec `The object exceeded the maximum allowed size` alors que le bucket `media` autorise bien 200 Mo. Deux causes :

1. **Limite globale Storage du projet Supabase** (séparée de la limite bucket) : par défaut **50 Mo**, c'est elle qui bloque.
2. **Méthode d'upload non adaptée** : `supabase.storage.upload()` envoie tout en un seul POST. Au-delà de ~50 Mo c'est instable (timeouts, RAM navigateur, pas de reprise). Supabase recommande **TUS / resumable** au-delà de 6 Mo.

## Action 1 — Relever la limite globale Storage (manuel, côté user)

À faire dans le dashboard Supabase (non scriptable) :

- Project Settings → Storage → **Upload file size limit** → passer à **200 MB**

Je l'indiquerai clairement dans le chat avec un lien direct vers la page Settings. Tant que cette valeur reste à 50 Mo, **aucun upload > 50 Mo ne fonctionnera**, quel que soit le code.

## Action 2 — Passer l'upload vidéo en resumable (TUS) côté code

Installer `tus-js-client` et créer un helper `src/lib/resumable-upload.ts` qui :

- Récupère la session Supabase (`access_token`)
- Pousse vers `https://<project>.supabase.co/storage/v1/upload/resumable`
- Headers : `Authorization: Bearer <token>`, `x-upsert: false`
- Métadonnées TUS : `bucketName: 'media'`, `objectName: <filePath>`, `contentType`, `cacheControl`
- Chunk size 6 Mo
- Expose `onProgress(percent)` et résout/rejette à la fin

Modifier `src/pages/Profile.tsx > handleMediaUpload` :

- Pour `type === 'video'` (ou `file.size > 6 * 1024 * 1024`) → utiliser le helper TUS
- Pour les images → garder `supabase.storage.upload()` actuel
- Ajouter un state `uploadProgress` (0–100) affiché sous le dropzone Vidéos pendant l'upload (barre de progression + libellé `%`)
- Messages d'erreur plus explicites : distinguer "trop volumineux" / "réseau" / "format non supporté"

## Action 3 — Traductions

Ajouter dans `src/i18n/locales/fr.json` et `en.json` sous `profile.media` :

- `uploading` : "Upload en cours…" / "Uploading…"
- `uploadProgress` : "{{percent}} %"
- `uploadNetworkError` / `uploadTooLarge`

## Détails techniques

```text
Browser → tus-js-client → POST /storage/v1/upload/resumable
                          (chunks 6 MB, reprise auto si coupure)
                          Authorization: Bearer <user JWT>
                          Upload-Metadata: bucketName=media,objectName=...,contentType=...
```

`tus-js-client` API utilisée :

```ts
new tus.Upload(file, {
  endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
  headers: { authorization: `Bearer ${token}`, 'x-upsert': 'false' },
  chunkSize: 6 * 1024 * 1024,
  metadata: { bucketName, objectName, contentType, cacheControl: '3600' },
  onProgress: (sent, total) => setProgress(Math.round(sent/total*100)),
  onSuccess: () => resolve(),
  onError: reject,
})
```

## Fichiers touchés

- nouveau : `src/lib/resumable-upload.ts`
- modifié : `src/pages/Profile.tsx` (handleMediaUpload + UI progress sous dropzone vidéos)
- modifié : `src/i18n/locales/{fr,en}.json` (clés upload progress)
- `package.json` : `+ tus-js-client`

## Hors scope

- Conversion / compression vidéo côté client
- Transcoding serveur
- Affichage progress pour images (taille toujours < 10 Mo)
- Migration des autres uploads (documents) — restent en standard upload, max 50 Mo OK
