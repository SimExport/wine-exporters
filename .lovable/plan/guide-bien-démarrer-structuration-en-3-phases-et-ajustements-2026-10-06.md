# Guide « Bien démarrer » — structuration en 3 phases et ajustements de texte

Uniquement de l'éditorial et de la mise en forme sur la page du guide. Aucune logique métier, aucune autre écran, aucun CTA, aucune route, aucune donnée ne change.

## 1. Découpage du parcours en trois phases

Petits intertitres au-dessus des cartes d'étapes, avec un filet horizontal discret :

```text
Préparation
──────────
[1] Complétez votre profil
[2] Ajoutez vos documents commerciaux
[3] Commencez par les Opportunités

Prospection
──────────
[4] Lancez votre recherche sur mesure
[5] Préparez votre première campagne
[6] Complétez votre prospection avec la base importateurs

Suivi
──────────
[7] Suivez tout dans le CRM
```

- Intertitre : petit libellé en capitales espacées, couleur texte atténuée, suivi d'un trait fin de la couleur des bordures.
- numérotation des étapes conservée telle quelle (1 à 7), les cartes et leur espacement ne bougent pas.

## 2. Étape « Ajoutez vos documents commerciaux »

La phrase existante sur les conditions par zone est remplacée par la formulation demandée :

- FR : « Si vos tarifs diffèrent fortement selon les zones, ajoutez par exemple un document Europe et un document International / Overseas. »
- EN : « If your prices differ strongly by region, add for example a Europe document and an International / Overseas document. »

## 3. Renommage de l'étape 6

- FR : « Complétez votre prospection avec la base importateurs »
- EN : « Expand your prospecting with the importer database »
- Le bouton reste « Ouvrir la base importateurs » / « Open the importer database », toujours vers la même page.

## 4. Section « Le rythme recommandé »

Une ligne courte et visuelle s'ajoute sous le texte existant, sous forme de pastilles reliées par des flèches dans le bordeaux de la marque :

- FR : « Chaque semaine : nouveaux contacts → réponses → relances → mise à jour CRM. »
- EN : "Every week: new contacts → replies → follow-ups → CRM update."

Le paragraphe et l'exemple déjà en place restent inchangés.

## 5. Ce qui ne change pas

Le titre, le sous-titre, le fil d'Ariane, les 7 titres et textes sauf ceux cités, les 7 boutons et leurs destinations, l'encart « outil de prospection, pas une marketplace », la ligne de boutons en bas de page, la carte « Bien démarrer » du tableau de bord et la carte des Ressources.

## Détails techniques

- Fichiers touchés : `src/pages/resources/GettingStarted.tsx`, `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`.
- Nouvelles clés i18n : `gettingStarted.phases.preparation` / `.prospection` / `.suivi`, `gettingStarted.rhythmCycleLabel`, `gettingStarted.rhythmCycle` (tableau de 4 termes).
- Textes modifiés : `gettingStarted.steps[1].text`, `gettingStarted.steps[5].title`.
- Dans `GettingStarted.tsx` : un tableau de constantes indique à quelle étape commencer chaque phase ; l'intertitre est inséré dans la liste avant les étapes 1, 4 et 7. Le rendu de la carte d'étape et du bloc « rythme » reste le même, avec un ajout pour la ligne de pastilles.
- Couleurs et typographies via les jetons existants (`border`, `muted-foreground`, `secondary`, `primary`) : aucune valeur en dur.
- Aucune route, aucune règle d'accès, aucun appel de données ne sont modifiés.
