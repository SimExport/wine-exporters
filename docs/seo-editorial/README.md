# Six articles WineExporters — revue éditoriale requise

Les six fichiers Markdown contiennent les articles rédigés et leur dossier de sources. `cms-drafts.json` contient six objets compatibles avec les champs du CMS `seo_articles` existant, tous en **draft**, avec `published_at: null`. Aucun script d’import automatique, aucune écriture en base.

## Relecture et intégration
- Le JSON est une préparation, pas une sauvegarde déjà effectuée. Relire dans l’admin existant ou décider séparément d’un import contrôlé. Ne jamais changer les statuts automatiquement.
- Les articles sont originaux, fondés sur les sources officielles citées. Les méthodes de qualification sont des conseils éditoriaux, pas des obligations légales.
- Les mots-clés sont des hypothèses d’intention : pas de volumes ou résultats Semrush revendiqués.
- Chaque fichier sépare le corps de son dossier de preuve. Le JSON contient le corps uniquement, avec citations proches des affirmations. Les six CTA pays utilisent désormais un encadré Markdown et un lien vers `/market-analysis`, tous deux déjà supportés ; le jeton générique reste supporté pour les autres articles.
- Les liens annuaire correspondent aux six routes d’aperçu existantes, aujourd’hui vides. Ne pas présenter cet espace comme une base publique complète ou une liste de partenaires déjà vérifiés.
- Avant publication, revalider les sources, les exigences du flux réel et les modalités réglementaires, notamment les exceptions produit/territoire. Aucun taux, volume de marché ou délai administratif inventé.
- Les liens articles → pays sont préparés. Les liens retour pays/entreprises → articles s’activent uniquement quand ces slugs sont réellement publiés dans le CMS. Les IDs des articles liés seront choisis après création réelle des drafts.
- Texte français non traduit automatiquement : l’interface annuaire est FR/EN ; chaque article conserve sa langue CMS.
- Sans images : aucune photo de société ni illustration fictive à publier. Une image éventuelle nécessite une provenance et des droits validés.

## Sources
Recherche de sources officielles pendant la session du 24 octobre 2026. Les dossiers détaillent la portée et les limites des preuves, notamment la prudence sur les guides anciens et les régimes provinciaux canadiens. Les données évolutives sont à vérifier de nouveau au jour de publication.

## Six angles distincts
1. États-Unis : permis fédéral, distribution territoriale, étiquette et engagement de lancement.
2. Royaume-Uni : GB/Irlande du Nord, rôle du grossiste et économie du prix rendu.
3. Allemagne : place dans le portefeuille, circulation européenne, suivi du réassort.
4. Belgique : rôles de réception, accises, identifiants et contrôle documentaire.
5. Japon : dossier technique, opérateur, formalités sanitaires et validation de l’habillage.
6. Canada : province, agent/acheteur/importateur, mandat et circuits Québec/Ontario.

## Point 6 BestWineImporters — apport propriétaire vérifié

### Audit réel et décision éditoriale

Extraction réalisée le **24 octobre 2026 à 12:44:15 UTC**, exclusivement avec des requêtes `SELECT` côté outil d’administration Supabase. Le schéma réel a été lu dans `information_schema.columns` pour `buyer_contacts`, `buyer_contact_enrichments`, `import_batches` et `buyer_contacts_import_staging`. Aucune ligne de contact, identité, adresse, email, téléphone, note, URL de preuve ou valeur de spécialité n’a été retournée. Aucun résultat individuel n’a été exporté. Aucune insertion, migration, modification RLS ou requête publique n’a été ajoutée.

Les agrégats ont bien été calculés pour les six pays, mais **aucun chiffre n’est retenu dans les articles, le JSON ou ce README**. Ce n’est pas une estimation ni un échec de lecture : c’est une exclusion éditoriale, car la définition d’une entreprise importatrice unique et les droits de réutilisation publique ne sont pas établis.

### Définition et méthode de mesure

- Périmètre : lignes de `buyer_contacts` dont `lower(trim(country))` correspond à une liste explicite d’alias : US (`united states`, `united states of america`, `usa`, `us`, `états-unis`, `etats-unis`), UK (`united kingdom`, `uk`, `great britain`, `royaume-uni`), DE (`germany`, `deutschland`, `allemagne`), BE (`belgium`, `belgique`, `belgië`), JP (`japan`, `japon`), CA (`canada`). Des variantes non listées peuvent être omises ; le périmètre n’est pas une population exhaustive nationale.
- Mesures par pays : `count(id)` des contacts, présence d’un nom et d’un site non vides, `count(distinct lower(nullif(trim(company_name),'')))`, présence d’un marqueur `source` ou `import_batch_id`.
- Jointure interne uniquement : `buyer_contact_enrichments.buyer_contact_id = buyer_contacts.id`. Mesures : présence d’un enrichissement, d’un `company_type` non vide, d’un tableau `wine_specialties` non vide et de statuts `partial` ou `review_needed`. Aucune typologie ou spécialité individuelle n’a été lue ni publiée.
- Source : tables internes WineExporters, pas Semrush, pas une statistique officielle du marché. Agrégation SQL avant retour des résultats : pas de pagination ni de comptage limité aux premiers résultats du navigateur.
- Limites constatées : nombre de lignes et nombre de noms normalisés diffèrent ; ni l’un ni l’autre ne déduplique des entités légales, filiales, établissements ou variantes de nom. Un site renseigné ne démontre ni activité d’importation, ni actualité, ni autorisation. Les enrichissements sont inégalement présents ; des fiches restent partielles ou à revoir. Une spécialité absente ne signifie pas absence d’activité. Aucun pourcentage ni classement fiable ne peut en être tiré.
- Droits : les champs de provenance ne constituent pas des licences. Le schéma examiné ne fournit pas de droit de publication publique vérifiable pour ces agrégats ; aucune autorisation contractuelle n’a été identifiée dans le matériel du projet. Cette absence de preuve ne signifie pas qu’un usage est juridiquement interdit, mais empêche de l’approuver ici.

### Alternative qualitative sourcée

Chaque article contient un bloc concret, adapté au pays, distinguant :
1. La base **connectée** : sélection du pays + recherche textuelle sur société, ville, adresse et email. Preuves : `src/pages/Importers.tsx` et définition réelle de `public.search_buyer_contacts` (schéma fourni). Aucun résultat privé n’est recopié et aucun filtre de spécialité, de licence ou de province n’est revendiqué.
2. La **demande d’analyse**, distincte : vins, prix export, certifications, préférences de partenaires et marché cible. Preuves : `src/components/market-analysis/options.ts`, champs existants du formulaire et route `src/App.tsx`. Ces champs ne sont pas des filtres de la base Importateurs.
3. Une limite pays spécifique : couverture par État aux États-Unis, GB/Irlande du Nord au Royaume-Uni, place dans la gamme en Allemagne, réception en Belgique, licence/dossier produit au Japon, rôle/province au Canada.

### CTA et compatibilité du rendu existant

`src/components/resources/ArticleContent.tsx` reconnaît exactement `[[CTA_ANALYSE_MARCHE]]` et `[[CTA_DEMO]]`, puis rend le Markdown restant. `ArticleCta.tsx` ne prend pas de contenu pays : inventer un jeton suffixé ne serait pas compatible. La solution minimale est donc **sans changement de composant** : encadré Markdown avec titre, texte et lien pays personnalisé vers `/market-analysis`. La même destination, confirmée dans `src/App.tsx`, ouvre le formulaire existant ; aucun paramètre de présélection ni nouveau parcours n’est ajouté. Le lecteur choisit son pays dans le formulaire.

Dans les six objets JSON, `cta_type: "none"` évite que `ResourceArticlePage.tsx` ajoute encore un CTA générique en pied d’article ; le CTA contextuel reste dans le corps. Les autres articles et jetons existants restent inchangés, avec le même parser et la même destination. Aucune promesse de résultats, validation réglementaire ou rapport pays déjà disponible.

### Chemins modifiés et validations restantes

- Contenu : `docs/seo-editorial/{etats-unis,royaume-uni,allemagne,belgique,japon,canada}.md` et `docs/seo-editorial/cms-drafts.json`.
- Documentation : ce `README.md` ; suivi de la demande dans `roadmap.md`. Aucun fichier de page, composant, RPC, annuaire, configuration ou migration modifié.
- Contrôles : tests existants des six drafts et de l’annuaire ; cohérence du corps Markdown/JSON et maintien de `draft` + `published_at: null` ; rendu et lien via le parser existant en contrôle local isolé, sans insérer d’article ; journal de compilation de l’aperçu.
- Restent à approuver : relecture éditoriale des ajouts et des sources, formulation des CTA, puis décision séparée d’intégration CMS et de publication. Pour introduire des chiffres plus tard : droits explicites sur l’usage public des agrégats, règles de déduplication/qualification des entreprises, provenance, couverture et validation des typologies.
- Rien n’est publié : pas d’écriture CMS, pas d’entreprise ajoutée, pas de nouvel accès public, pas de déploiement. Les parcours de demande après soumission ne sont pas modifiés ni testés par une demande réelle dans ce travail éditorial.
