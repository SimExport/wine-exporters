# Fiches techniques : pouvoir les nommer et les ouvrir

## Ce qui bloque

Vérifié côté données : les 20+ fiches techniques du Domaine Pannagel ont bien été importées le 09/09. Le problème est donc côté écran, pas côté import.

Dans l'onglet « Fiches techniques » du profil, le tableau affiche seulement quatre cases à remplir (Cuvée, Millésime, Format, Langue) et un bouton Supprimer. Il n'y a :

- aucune colonne avec le nom du document, donc impossible de savoir quelle ligne correspond à quel fichier ;
- aucun moyen d'ouvrir ou de télécharger le PDF pour le vérifier ;
- aucun champ pour renommer la fiche (le nom reste celui du fichier importé).

De plus, chaque lettre tapée dans les cases déclenche un enregistrement immédiat, ce qui rend la saisie saccadée et peut faire perdre du texte — ce qui explique l'impression que « ça ne se sélectionne pas ».

## Ce qu'on va faire

1. Ajouter une colonne « Nom de la fiche » en première position, modifiable, avec le nom du fichier affiché en dessous en petit pour se repérer.
2. Rendre chaque fiche ouvrable : un lien / bouton « Ouvrir » qui affiche le PDF dans un nouvel onglet.
3. Rendre la saisie fluide : le texte se conserve pendant la frappe et l'enregistrement se fait quand on quitte le champ, avec un discret « Enregistré ».
4. Trier les fiches par nom pour retrouver facilement une cuvée dans une longue liste.
5. Textes en français et en anglais.

Aucun changement sur l'import, la suppression, les campagnes ou le reste du profil.

## Détails techniques

- `src/pages/Profile.tsx`, onglet `tech-sheets` uniquement : ajout d'une colonne `title` et d'un lien `file_url` (`target="_blank" rel="noopener noreferrer"`).
- Saisie : état local par ligne (valeurs contrôlées en mémoire), `handleUpdateDocument` appelé sur `onBlur` au lieu de `onChange`, pour `title`, `cuvee`, `vintage`, `format`, `language`.
- Nouvelles clés i18n sous `profile.techSheets.*` dans `src/i18n/locales/fr.json` et `en.json`.
- Aucune migration ni changement de politique RLS : les colonnes `title` et `file_url` existent déjà.
