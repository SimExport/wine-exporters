# Badge « Fiche enrichie » dans la liste /importers

## Résultat attendu
Dans la colonne « Nom de la société », un petit badge arrondi apparaît sous le nom des importateurs qui ont une fiche enrichie :
- FR : « Fiche enrichie »
- EN : « Enriched profile »

Style : pastille compacte avec fond or doux, texte bordeaux et une petite icône étincelle, en accord avec la charte (bordeaux, crème, or). Le badge est placé sous le nom pour ne pas élargir la colonne. Aucun badge sur les autres fiches, et rien d'autre ne change dans la liste.

## Détails techniques
- Fonction `search_buyer_contacts` : renvoyer en plus un simple indicateur `is_enriched` (oui/non) dans chaque ligne, au lieu de le retirer. Aucun contenu d'enrichissement n'est exposé, et les droits d'accès restent les mêmes.
- `src/pages/Importers.tsx` : afficher le badge quand `contact.is_enriched` est vrai.
- `src/index.css` : tokens `--enriched-badge-bg` / `--enriched-badge-fg` (or doux / bordeaux), avec une variante pour le mode sombre.
- Traductions ajoutées au module FR/EN dédié aux fiches importateurs (`importerProfile.enrichedBadge`).
- Exports inchangés : leurs colonnes sont fixes, donc l'indicateur n'apparaît pas dans les fichiers.
