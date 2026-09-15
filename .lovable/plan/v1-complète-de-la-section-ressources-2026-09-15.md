# V1 complète de la section Ressources

Objectif : créer les 7 pages de ressources restantes, rendre toutes les cartes cliquables et relier les étapes suivantes. Périmètre strictement limité à la section Ressources (page /ressources, pages de détail, routes, traductions).

## 1. Généraliser le template de page ressource

Le template actuel (`ResourceArticle`) impose un enchaînement fixe de sections et un seul modèle d'email. Il est rendu flexible sans changer son apparence :

- Chaque section (introduction, « quand utiliser », « ce que nous recommandons », étapes numérotées, sections en liste libre, modèles d'email, « à éviter », « à retenir », « étape suivante ») ne s'affiche que si son contenu existe dans les traductions de la ressource.
- Support de plusieurs modèles d'email sur une même page (ressource 5 : 3 relances), chacun avec son propre bouton « Copier le modèle » / « Copy template » et son retour « Modèle copié ».
- Support d'une vidéo Loom intégrée en 16:9 responsive (ressources 7 et 8), avec le même comportement sobre que le reste de la page.
- Support de sections libres supplémentaires (ex. « Ce qu'il n'est pas nécessaire d'envoyer immédiatement », « Calendrier recommandé », « Quand relancer », « Ce qu'il faut chercher à comprendre », « Avant l'envoi », « Après l'envoi »), en liste ou en paragraphes.
- Lien discret « Retour aux ressources » / « Back to resources » ajouté en bas de page, en plus du fil d'ariane existant.

La page déjà en ligne (premier email) reste identique visuellement.

## 2. Créer les 7 pages restantes

Chacune est un fichier mince réutilisant le template, avec sa route ajoutée sous la même mise en page que /ressources :

| Ressource | Route |
| --- | --- |
| Suivi après campagne WineExporters | /ressources/suivi-campagne-wineexporters |
| Que joindre à un premier email ? | /ressources/documents-premier-email |
| Comment structurer vos relances | /ressources/structurer-relances |
| 3 modèles de mails de relance | /ressources/modeles-relance |
| Répondre à une opportunité | /ressources/repondre-opportunite |
| Envoyer des échantillons | /ressources/envoi-echantillons |
| Relancer après une dégustation | /ressources/relance-apres-degustation |

Contenu FR et EN exactement celui fourni, intégralement dans les fichiers de traduction (aucun texte visible dans le code). Les modèles d'email restent en anglais comme fournis.

Vidéos Loom réutilisées : échantillons (4ac94b14…) pour la ressource 7, retour de dégustation (761b4b30…) pour la ressource 8.

## 3. Cartes et navigation

- Les 8 cartes « Ressources essentielles » pointent chacune vers sa page ; toute la carte devient cliquable, en gardant le CTA visible.
- Les 4 cartes principales du haut font défiler la page vers le bon endroit via des ancres :
  - Contacter un importateur → ancre du bloc « Ressources essentielles »
  - Suivre une campagne WineExporters → ressource 2
  - Relancer un prospect → ressource 4
  - Faire avancer une opportunité → ressource 6
  Pas de filtres, pas de nouvelles pages de catégorie.
- Étapes suivantes reliées : Premier email → Documents → Structurer les relances → Modèles de relance ; Campagne → Structurer les relances ; Opportunité → Échantillons → Relance après dégustation.
- Le bloc « Vidéos pratiques » et son modal restent inchangés (aucune iframe chargée avant le clic).

## Détails techniques

- `src/components/resources/ResourceArticle.tsx` : sections rendues conditionnellement via présence des clés i18n (`t(..., { returnObjects: true })` + `defaultValue`), nouveau champ optionnel `loomEmbedUrl` dans la config, `templates` en tableau (rétro-compatible avec la clé `template` unique), état `copied` par index.
- 7 nouveaux fichiers dans `src/pages/resources/`, chacun exportant une `ResourceArticleConfig` (i18nKey, path, type, nextHref?, loomEmbedUrl?).
- 7 routes ajoutées dans `src/App.tsx` sous `DashboardLayout`, après la route existante.
- `src/pages/Resources.tsx` : `href` renseigné sur les 8 entrées `ESSENTIAL_RESOURCES`, carte entière en `Link`, ancres `id` sur les sections/cartes ciblées, `href` d'ancre sur les 4 cartes principales, `scroll-mt` pour l'offset.
- `src/i18n/locales/fr.json` / `en.json` : clés `resources.articles.<slug>` pour les 7 ressources + `resources.backToResources`.
- Vérification : `bunx tsgo -p tsconfig.app.json --noEmit` et validation des JSON.

## Hors périmètre

Aucun CMS, base de données, moteur de recherche, favoris, permissions ni IA. Aucune modification en dehors de la section Ressources.
