# Appels d’offres — V1 en prévisualisation

## Périmètre

Seul l’onglet **Appels d’offres** de `/opportunites` change. Aucun changement de données, de notifications, de droits d’accès ou du traitement des demandes directes. Aucune migration, aucun déploiement ni publication.

Audit en lecture seule du 24 novembre 2026 : 150 appels publiés, 33 échéances de réponse absentes. Le schéma n’a pas de date de début : aucune date ni état « à venir » n’est inventé.

## Recherche et filtres

- Recherche sans accents et sans distinction de casse sur référence, marché, appellation/origine, catégorie, profil et critères originaux/FR/EN ; les champs anciennement recherchables (société de l’agent, prix, millésime) restent disponibles.
- Les critères passent par le nettoyage de présentation existant ; les notes stockées restent inchangées.
- Variantes de langue regroupées par monopole/pays, notamment Vinmonopolet et LCBO/Vintages. Systembolaget et Wineability restent distincts.
- Catégories FR/EN normalisées. Un effervescent rosé se retrouve sous Effervescent et Rosé ; les catégories inconnues restent sélectionnables sans déduction.
- Filtres combinés par intersection : marché, type de vin et échéance.
- Dates seules : une échéance reste ouverte jusqu’à la fin de son jour à Paris. Un horodatage explicite respecte son heure. Dates absentes, invalides ou ambiguës : **À confirmer**, jamais **Ouvert**. La date des échantillons ne remplace jamais celle de réponse.
- Tri croissant/décroissant par échéance ; dates inconnues en dernier. Compteur, réinitialisation et pagination fixe de dix résultats. Changer un filtre remet la pagination à la première page.

## Décisions techniques

- Les appels publiés sont lus par lots de 200, avec un ordre stable `created_at, id`, via le client utilisateur normal ; les filtres/tri précèdent toujours la pagination d’affichage, afin de couvrir toute la collection, y compris au-delà du plafond de lecture par défaut.
- Une erreur de lot n’expose pas une collection partielle : un message et Réessayer remplacent les résultats.
- Les filtres Appels d’offres ont un état distinct des filtres historiques Demandes directes/Archives. Les cartes et les actions existantes restent partagées avec les archives.
- Les fonctions de découverte sont isolées et sans React pour tester les règles sans compte ni écriture.

## Fichiers

- `src/pages/Opportunities.tsx`
- `src/components/TenderFilters.tsx`
- `src/lib/tender-discovery.ts`
- `src/lib/tender-discovery.test.ts`
- `src/i18n/locales/opportunities-ui.ts`
- `roadmap.md`
- `docs/tender-discovery-v1.md`

## Vérifications

- Tests ciblés : recherche FR/EN, variantes marchés/vins, filtres combinés, dates expirées et inconnues, heure Paris été/hiver, tri, pagination après recherche, lecture de 1 250 lignes et échec d’un lot.
- Vérification navigateur isolée : 350 appels fictifs en FR à 1280 pixels et EN à 390 pixels ; dix cartes par page, résultat n°349 retrouvé depuis une recherche sur la page 2, filtres combinés, réinitialisation, états expirés/sans date, reprise après erreur. Aucun débordement horizontal ni erreur de script.
- Consultation, ajout CRM, archivage et restauration testés uniquement avec réponses interceptées ; aucune écriture Supabase réelle.
- Compilation automatique du projet réussie.
- **Non vérifié** : parcours avec une vraie session producteur (le Supabase externe ne fournit pas de session de test ici).