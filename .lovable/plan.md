## Problème

L'erreur affichée par le client :

```
Erreur d'upload
Invalid key: 55a6277e-.../tech_sheet/1778661412756_2022 Pinot Gris Réserve KIEFFER.pdf
```

Vient de Supabase Storage qui **rejette les clés contenant des caractères non-ASCII** (ici l'accent `é` de « Réserve »). Les espaces et autres caractères spéciaux (`’`, `«`, `°`, `–`, etc.) posent aussi régulièrement problème. C'est la raison pour laquelle :
- 2 fiches passent (noms « propres »)
- 2 fiches échouent systématiquement (noms avec accents / caractères spéciaux)
- Ce n'est ni une limite de taille ni une limite de quota.

## Correctif

Dans `src/pages/Profile.tsx`, fonctions `handleDocumentUpload` (ligne 513) et `handleMediaUpload` (ligne 573), le `filePath` est construit directement avec `file.name`. Il faut sanitiser **uniquement la clé Storage**, tout en gardant le nom original pour l'affichage (`title`, `file_name` en base et le toast).

### Détails techniques

Ajouter une petite fonction utilitaire en haut du fichier :

```ts
const sanitizeStorageKey = (name: string) => {
  // Sépare nom + extension
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext  = dot > 0 ? name.slice(dot) : '';
  const cleanBase = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // retire les accents
    .replace(/[^a-zA-Z0-9._-]+/g, '_')                  // remplace tout caractère non sûr
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'file';
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return cleanBase + cleanExt;
};
```

Puis remplacer :

- `${user.id}/${category}/${Date.now()}_${file.name}` → `${user.id}/${category}/${Date.now()}_${sanitizeStorageKey(file.name)}`
- `${user.id}/${type}/${Date.now()}_${file.name}` → idem pour les médias.

**Important :** on continue d'enregistrer `file.name` (avec les accents) dans `documents.file_name` / `documents.title` / `media.title`, pour que l'utilisateur retrouve son nom d'origine dans l'UI. Seule la clé Storage est nettoyée.

### Bonus très court

Améliorer aussi le message d'erreur affiché : si le `error.message` contient `Invalid key`, afficher un toast plus parlant en FR/EN (« Le nom du fichier contient des caractères non supportés. Réessayez. ») — utile uniquement si jamais un cas reste après sanitization. (Optionnel, je peux l'inclure ou non.)

## Hors scope

- Pas de changement du bucket, des policies RLS, ni de la base.
- Pas de modification des handlers drag & drop déjà ajoutés.
- Pas de retraitement des anciens fichiers déjà uploadés.

## Vérification

Après déploiement, demander au client de re-tenter les 2 fiches techniques qui échouaient (`2022 Pinot Gris Réserve KIEFFER.pdf` etc.). L'upload doit aboutir et le nom affiché dans le tableau doit rester avec ses accents.
