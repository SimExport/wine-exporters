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

## Vérifications réalisées
- Six tests de règles réussis : registre vide, double approbation, six pays exacts, cinq par pays/trente total, projection sans champs privés, rejet des entrées insuffisantes ou contenant des coordonnées.
- Deux tests des payloads éditoriaux : six pays, six drafts sans date de publication ; six tests de régression des fiches privées réussis.
- Navigation publique Playwright : accueil annuaire, six pages pays, fiche inconnue, retour annuaire, changement FR/EN, lien de demande de compte vers `/demande-demo`.
- Canonical et noindex contrôlés pour les six pays ; un H1 par page ; asset public égal à `[]` ; zéro requête aux tables privées ou à `get_importer_profile`, zéro exception JavaScript sur le parcours.
- Captures examinées à 1280×1800 et 390×844, sans débordement horizontal mobile. Logo public existant non chargé dans cet environnement : inchangé, hors périmètre de cette V1.
- HTML initial récupéré sans le contenu annuaire : la limite CSR est confirmée, pas seulement déduite du code.
- RPC privée testée avec un UUID nul fictif en anonyme : HTTP 401, aucune donnée renvoyée ; liens démo et ressources aller/retour vérifiés.
- Journal de compilation automatique : build OK. Pas de build lancé manuellement, aucun déploiement/publication.
## Mise à jour du 24 octobre 2026 — 35 fiches en aperçu
Limites portées à 10 par pays et 60 au total. 60 candidats fournis ; chacun recherché par nom dans `buyer_contacts` (lecture seule : nom, pays, site uniquement, aucune coordonnée), puis site officiel HTTPS consulté le 24/10/2026. Descriptions originales de 2 à 3 phrases, sans chiffre autre qu'une date ou une durée affichée par l'entreprise elle-même. `rights: true` signifie « texte original issu de pages publiques, sans donnée privée ni sous licence » — **pas** une autorisation obtenue de l'entreprise.

| Pays | Intégrées |
|---|---|
| États-Unis | 8 |
| Royaume-Uni | 10 |
| Allemagne | 4 |
| Belgique | 4 |
| Japon | 4 |
| Canada | 5 |
| **Total** | **35** |

### Exclusions (25)
- US — Aiko Importers : le site montre des produits fantaisie, activité vin non confirmée. Atherton Wine Imports : le domaine enregistré affiche une page d'hébergeur sans contenu vin.
- DE — Weinimport Aumüller : page sans texte descriptif exploitable. Weinimport Eigelsbach : page limitée aux coordonnées d'une personne. Hauser Weinimport : site centré sur la production de boissons à base de vin, import non confirmé. Jacopini Import : boutique en ligne, activité d'import non confirmée. Weinimport Buttgereit : site injoignable. Klocke Weinimporte : grossiste en décoration/fleuristerie, le vin n'y est qu'une gamme parmi d'autres.
- BE — Global Wineries : site néerlandophone sans confirmation du siège belge (risque Pays-Bas signalé). Le Wine : site en maintenance et marque présente en Belgique, aux Pays-Bas et en France, entité non identifiable. Crombe Wines, Licata, TG Vins : boutiques/cavistes, importation non confirmée sur le site. Matthys Wine Import : ni le siège belge ni l'activité d'import confirmés sur les pages lisibles.
- JP — Hakurai Wine Trading : aucun site dans buyer_contacts, correspondance avec le site trouvé non certaine. Eurovin Japan, FIC Wine, Heavenly Vines, Vin Passion : importation non confirmée sur les pages lisibles. Wine Diamonds : site injoignable.
- CA — Agence de Vins David Francis : site expiré. Amethyst Wine Agency : page vide/404. AmoVino, Vins Philippe Dandurand : sites injoignables. Escalade Wines & Spirits : contenu identique à celui d'Authentic Wines and Spirits, identité distincte non vérifiable.

### Statut
Toutes les pages annuaire restent `noindex, nofollow`, hors sitemap ; aucune publication, aucune écriture Supabase, RLS, auth, campagnes ou CMS. Descriptions en français uniquement (le format public ne prévoit qu'un champ). Avant indexation : relecture humaine des sources de chaque fiche et décision de publication SEO.
