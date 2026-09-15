# Export des contacts : tout dans une seule colonne chez le client

## Ce qui se passe

Le fichier téléchargé depuis la page Importateurs est un fichier CSV dont les champs sont séparés par des virgules, sans marqueur d'encodage. Excel en configuration française attend un point-virgule comme séparateur : il met donc toute la ligne dans une seule colonne, virgules visibles. Chez vous le fichier s'ouvre bien parce que votre tableur est configuré avec la virgule (ou vous l'ouvrez dans Google Sheets / Numbers, qui devinent le séparateur).

Ce n'est donc pas un problème de données : c'est le format du fichier qui n'est pas adapté à Excel en français.

## Correction

Rendre le fichier exporté directement lisible par Excel, quelle que soit la langue du poste :

- séparer les colonnes par un point-virgule au lieu d'une virgule ;
- ajouter la ligne d'en-tête technique que Excel reconnaît pour choisir le bon séparateur ;
- ajouter le marqueur d'encodage UTF-8 pour que les accents (Genève, Liège…) s'affichent correctement ;
- utiliser des fins de ligne compatibles Windows.

Résultat : les huit contacts du Liechtenstein s'ouvrent en colonnes propres (société, pays, ville, email, téléphone, site, rue, code postal, région) chez tout le monde, sans manipulation.

## Détails techniques

Dans `src/pages/Importers.tsx`, fonction d'export : délimiteur `;`, préfixe `sep=;\r\n`, BOM `\uFEFF` en tête du `Blob`, jointure des lignes en `\r\n`. Échappement des guillemets inchangé. Aucun changement sur la requête, les crédits d'export, la sélection ou les colonnes exportées.

## Hors périmètre

Pas de passage à un vrai fichier Excel (.xlsx), pas de modification des autres exports de l'application.
