# Faire évoluer la page résultat vers la conversion WineExporters

## Résultat attendu

La page publique `/market-analysis/result/:id` conservera l’analyse personnalisée comme contenu principal, puis introduira progressivement la preuve sociale, les usages de la plateforme, des résultats clients et la prise de rendez-vous.

## Modifications prévues

1. **Préserver la partie analyse**
   - Conserver sans changement le badge, le titre, le sous-titre dynamique, les informations du domaine, la synthèse, l’approche recommandée et les cartes importateurs.
   - Ne modifier ni les données affichées, ni leur génération, ni les états de chargement, d’échec ou d’absence de résultat.

2. **Réorganiser la shortlist après le troisième importateur**
   - Afficher les trois premiers profils dans leur présentation actuelle.
   - Ajouter juste après un bloc compact « Des vignerons utilisent déjà WineExporters », avec les témoignages d’Arnaud et Mathilde.
   - Présenter les témoignages côte à côte sur ordinateur et l’un sous l’autre sur mobile.
   - Conserver ensuite le CTA intermédiaire existant, avec son texte demandé et son lien Google Calendar ouvert dans un nouvel onglet.
   - Afficher tous les importateurs restants sans autre interruption marketing.

3. **Faire évoluer le bloc produit**
   - Remplacer le contenu actuel par « Vous avez identifié les bons importateurs. Et maintenant ? » et son sous-titre.
   - Ajouter cinq briques sobres : Identifier, Contacter, Suivre, Saisir les opportunités et Détecter de nouveaux marchés.
   - Conserver le parcours visuel « Identifier → Contacter → Suivre → Relancer → Convertir » et sa phrase de conclusion.
   - Utiliser une grille équilibrée sur ordinateur et une disposition lisible sur mobile, sans illustrations génériques ni surcharge d’icônes.

4. **Ajouter la preuve par les marchés ouverts**
   - Créer une section compacte « Des domaines qui ouvrent de nouveaux marchés ».
   - Afficher uniquement les cinq exemples fournis : Château de France, Maison Kieffer, Potel-Aviron, Château Paquet et Domaine de Ness, avec leurs marchés exacts.
   - Utiliser les drapeaux correspondant aux pays, sans ajouter de chiffres, dates, commandes ou autres affirmations.

5. **Renforcer le CTA final**
   - Remplacer son titre et son texte par les formulations fournies.
   - Garder un seul bouton principal « Découvrir WineExporters en démo », avec exactement la destination externe actuelle et les protections du nouvel onglet.
   - Ajouter la mention discrète « Présentation personnalisée de la plateforme. » sous le bouton.

6. **Ajouter les versions française et anglaise**
   - Étendre uniquement les textes de `marketAnalysisResult` dans les fichiers de traduction existants.
   - Traduire fidèlement les témoignages, les cinq usages produit, les preuves clients et le CTA final, sans toucher aux autres textes du parcours.

## Direction visuelle

- Conserver le fond crème, le bordeaux, les accents or discrets et la typographie actuelle.
- Utiliser des cartes sobres, des séparations légères et une hiérarchie continue avec l’analyse plutôt qu’une succession de grandes sections promotionnelles.
- Limiter la hauteur des témoignages et des preuves clients ; préserver des espacements généreux et une lecture B2B premium.

## Vérification

- Contrôler la page avec une analyse terminée sur ordinateur et mobile.
- Vérifier l’ordre exact des blocs, la continuité de la shortlist, la lisibilité des nouvelles cartes et l’absence de chevauchement.
- Tester les deux CTA de démonstration : ouverture du même lien Google Calendar dans un nouvel onglet externe avec `noopener noreferrer`.
- Confirmer que seules la page résultat et ses traductions FR/EN ont changé ; aucun formulaire, autre page, traitement, score, prompt, fonction ou élément Supabase ne sera modifié.
