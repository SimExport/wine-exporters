## 1. À quoi correspond « Localisation » dans le Profil

Sur l'onglet **Général**, le champ « Localisation » est un simple champ texte libre où le client renseigne **la ville et le pays du domaine** (placeholder existant : « Bordeaux, France »).

Dans le cas de Maison Kieffer, c'est le seul champ manquant pour atteindre 100 % (12/13) — il suffit d'écrire par exemple « Eguisheim, France » ou « Alsace, France ».

Ce champ sert ensuite à :
- afficher le domaine sur la carte / dans les fiches importateur,
- améliorer la pertinence du ciblage des campagnes.

Aucune action de notre côté n'est nécessaire pour ce point — c'est juste à expliquer au client. Si tu veux, on peut aussi rendre le label plus explicite (ex: « Localisation (ville, pays) ») pour éviter la confusion à l'avenir.

## 2. Pourquoi le « glissé-déposé » ne fonctionne pas

J'ai vérifié `src/pages/Profile.tsx` : les 5 zones d'upload (Présentation, Tarifs, Autres documents, Fiches techniques, Médias) **affichent le texte « Glissez-déposez vos fichiers ici »** mais **n'ont aucun handler `onDrop` / `onDragOver`**. Seul le bouton « Ajouter » fonctionne (il ouvre le sélecteur de fichiers).

C'est donc un bug : le visuel promet du drag & drop, mais le code ne l'implémente pas.

## 3. Correctif proposé

Ajouter de vrais handlers drag & drop sur les 5 zones pointillées :

- `onDragOver` → `e.preventDefault()` + état `isDragging` pour feedback visuel (bordure primary)
- `onDragLeave` → reset `isDragging`
- `onDrop` → `e.preventDefault()` + récupération de `e.dataTransfer.files` + appel de `handleMultipleDocumentUpload(files, category)` (ou l'équivalent média)

Zones concernées dans `src/pages/Profile.tsx` :
1. Documents → Présentation (cat. `presentation`)
2. Documents → Tarifs (cat. `price_list`)
3. Documents → Autres (cat. `other`)
4. Fiches techniques (cat. `tech_sheet`)
5. Médias → Photos & Vidéos (upload média existant)

Pour éviter la duplication, créer un petit composant `DropZone` réutilisable (props : `accept`, `onFiles`, `label`, `buttonLabel`, `disabled`) et remplacer les 5 blocs actuels par ce composant.

### Détails techniques

- Filtrage côté client par extension/MIME selon le `accept` pour rejeter proprement les fichiers non supportés (toast d'erreur via `useToast`).
- Conserver le `<input type="file" hidden>` pour le clic bouton (fallback + accessibilité).
- Ajouter un état visuel `data-dragging` qui passe la bordure et le fond en couleur `primary/10` pendant le survol.
- Aucun changement backend, RLS, ou base de données.

## 4. Hors scope

- Pas de modification de la logique d'upload Supabase Storage existante.
- Pas de changement du label « Localisation » (à confirmer si tu veux qu'on le renomme en « Localisation (ville, pays) »).