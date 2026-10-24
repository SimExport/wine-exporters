# WineExporters — SEO / annuaire V1

## Livraison limitée à l’aperçu
- Routes : `/annuaire`, `/annuaire/etats-unis`, `/annuaire/royaume-uni`, `/annuaire/allemagne`, `/annuaire/belgique`, `/annuaire/japon`, `/annuaire/canada`, `/annuaire/:country/:slug`.
- Liste publique **vide** : aucune entreprise inventée, aucune fiche privée copiée, aucune écriture en base. Les routes entreprise inconnues affichent un état indisponible, sans exemple réel.
- H1, titre, description, canonical autoréférent, navigation, ressources et CTA FR/EN. Demander un compte utilise `/demande-demo`, parcours existant ; aucune inscription ajoutée.
- Les six articles sont préparés dans `docs/seo-editorial/`, sans insertion CMS ni publication. Le CMS sait créer des drafts sûrs au regard de sa RLS, mais cette base est la production partagée : le choix le plus conservateur est zéro écriture.

## Audit réel — 24 octobre 2026
Lecture du schéma et des catalogues PostgreSQL via les outils Supabase, sans lecture/export de coordonnées personnelles.
- `seo_articles` : RLS active ; lecture anonyme limitée à `published` avec `published_at <= now()` ; création/modification/suppression réservées aux administrateurs par `has_role`. Les privilèges effectifs SELECT/INSERT existent pour anon/authenticated, mais RLS bloque l’insertion anonyme.
- Tables d’enrichissement : RLS active ; aucune policy de lecture directe ; privilèges SELECT anon/authenticated absents sur `buyer_contact_enrichments`.
- `get_importer_profile` : SECURITY DEFINER, `search_path=public`, EXECUTE refusé à anon, accordé à authenticated ; contrôle auth et essai ExportVins préservés. Aucun changement de fonction ni de privilège.
- **Risque préexistant séparé** : `buyer_contacts` a RLS désactivée et anon dispose effectivement de SELECT et INSERT. Les policies présentes sont donc inactives. Cette V1 ne consulte pas cette table et ne prétend pas que ses données sont protégées. Une correction dédiée des permissions existantes est nécessaire après analyse des usages et approbation ; aucun élargissement ici.
- Aucun catalogue public distinct ni champ de consentement/licence/publication identifiable dans les tables et colonnes auditées. `source`, `source_record_id`, `import_batch_id` et les URLs de preuves privées ne prouvent pas un droit de republication. Aucune entreprise ne peut donc être publiée sûrement.

## Contrat de publication (build/serveur seulement)
`scripts/public-directory.ts` contient une liste explicitement approuvée, actuellement vide. Le navigateur lit seulement `/directory-public.json`, produit par le serveur de développement ou comme asset statique du build, jamais les tables privées.

Allowlist : `slug`, `countryCode`, `name`, `description`, `website`, `sources`. L’identifiant interne, les preuves d’autorisation et les champs inconnus ne sont pas projetés. Limites : US/UK/DE/BE/JP/CA, cinq entreprises par pays, trente au total. Texte et URLs font l’objet de contrôles conservateurs ; **ils ne remplacent pas la revue humaine**, notamment pour les noms de personnes intégrés à un texte.

Avant tout ajout : confirmer une entreprise réellement existante dans le projet, les droits sur chaque champ, la provenance publique indépendante, l’absence de données personnelles/licenciées et une description suffisante. Conserver les justificatifs sensibles hors du dépôt ; le registre ne doit contenir qu’une référence non sensible à l’approbation. Ne jamais remplir ce registre par extraction des enrichissements privés. Pas de tableau d’administration supplémentaire en V1.

## SEO : limites et étapes d’approbation
- React/Vite reste CSR. Helmet modifie le head après JavaScript : **pas de HTML pré-rendu**, pas de garantie de métadonnées par route pour les robots sociaux sans JS. Le serveur peut retourner 200 même pour une fiche inconnue (soft 404) ; le template indique noindex.
- Tous les templates annuaire sont `noindex, nofollow`, avec canonical autoréférent ; rien ajouté à robots ou aux sitemaps. Les liens pays permettent la navigation de l’aperçu, pas une revendication de publication.
- Les liens articles → pays sont préparés dans les drafts ; les pays/entreprises ne lient que les articles réellement publiés identifiés par leur slug. Aucun lien vers un article draft inexistant.
- Pas de schema Organization fictif ni de statistiques sans source. Pas de promesse de volumes de recherche : cette V1 éditoriale n’a pas d’étude Semrush.
- Avant indexation : revue éditoriale, publication CMS décidée explicitement, approbation des fiches, pages réellement non vides, retrait sélectif du noindex et ajout des seules URLs publiées au sitemap. Fournir une date de modification significative propre à chaque page ou omettre lastmod, jamais la date du build.
- Les sitemaps existants n’ont pas été modifiés : le statique ne contient pas lastmod ; la fonction articles utilise `updated_at` (timestamp de ligne, non une preuve indépendante de modification éditoriale significative). Sa politique lastmod devra être revue lors d’une modification de cette fonction, hors de cette V1 isolée.
- Pas de déploiement Edge Function, migration, changement de campagnes/Brevo/quotas/abonnements ni publication du projet.

## Approbations restantes
1. Relire et valider les six articles et leurs sources à la date de publication, puis décider de leur import comme drafts CMS.
2. Fournir les autorisations et champs réellement republiables des éventuelles entreprises existantes (maximum trente).
3. Autoriser séparément la publication/indexation et, si souhaité, un travail SSR.
4. Traiter séparément les droits préexistants de `buyer_contacts` ; aucun correctif de production appliqué par cette V1.