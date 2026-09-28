# Ressources publiques + articles SEO

## Constat actuel
- `/ressources` et ses 8 pages de détail sont enveloppées dans la mise en page du tableau de bord, qui renvoie tout visiteur non connecté vers `/auth`.
- Les contenus privés (cartes, 8 ressources essentielles, vidéos Loom) sont figés dans le code et les traductions ; aucune donnée en base.
- Le sitemap est un fichier statique ; `/ressources` n'y figure pas.

## 1. /ressources accessible à tous
- Nouvelle mise en page légère « publique » (barre de navigation du site + pied de page) utilisée quand le visiteur n'est pas connecté ; les utilisateurs connectés gardent exactement la mise en page actuelle avec la barre latérale.
- La page affiche deux sections distinctes :
  - **Ressources publiques** : liste des articles publiés (catégorie, pays, extrait, date), article mis en avant en tête.
  - **Ressources WineExporters** : les cartes et ressources actuelles. Connecté : inchangé. Non connecté : titre + courte description, badge « Réservé aux utilisateurs WineExporters », boutons « Se connecter » et « Découvrir WineExporters en démo » ; les vidéos ne s'ouvrent pas.
- Les 8 pages de détail privées restent protégées (redirection vers la connexion, comme aujourd'hui). Aucun contenu supprimé ni converti.

## 2. Articles SEO en base
Nouvelle table `seo_articles` : title, slug (unique), excerpt, content, category, country, featured_image, author, status (draft/published), published_at, meta_title, meta_description, focus_keyword, canonical_url, is_featured, reading_time, cta_type, related_article_ids, faq, created_at, updated_at.
- Lecture publique uniquement des articles `published` avec date passée ; création/modification/suppression réservées aux admins.
- Contenu en **Markdown** (H2/H3, listes, liens, encadrés via citations, balise CTA spéciale), FAQ stockée séparément en liste question/réponse. Format simple à produire par ChatGPT ou une automatisation via Supabase.

## 3. Page article /ressources/[slug]
- Les 8 routes privées existantes gardent la priorité ; tout autre slug charge un article.
- Contenu : fil d'ariane, catégorie, H1 unique, introduction, dates publication/mise à jour, temps de lecture, contenu, FAQ, CTA WineExporters, articles liés. Slug inconnu ou brouillon : page 404 en noindex.

## 4. SEO technique
- Par article : title, meta description, canonical, Open Graph, Twitter card, schema.org Article, FAQPage si FAQ.
- Sitemap : fonction serveur générant le sitemap des articles publiés, référencée dans `robots.txt` en plus du sitemap actuel ; `/ressources` ajoutée au sitemap statique.
- Limite à connaître : le site est une application côté navigateur. Google exécute le JavaScript et lira les métadonnées, mais certains robots (réseaux sociaux, IA) ne voient que la page de base. Un rendu serveur complet nécessiterait une migration séparée, hors de ce périmètre.

## 5. Maillage interne et CTA
- Articles liés : choix manuel dans l'admin, sinon automatique (même catégorie puis même pays, 3 max).
- Bloc CTA réutilisable : « Vous cherchez des importateurs pour vos vins ? » + texte, bouton principal « Analyser mon marché » (/market-analysis), secondaire « Découvrir WineExporters » (lien démo existant). Placé en fin d'article et insérable dans le contenu.

## 6. Admin « SEO / Ressources »
- Nouvelle page `/admin/ressources` dans la navigation Administration : liste (statut, catégorie, pays, date), recherche, créer, modifier, publier/dépublier, supprimer.
- Formulaire simple : champs ci-dessus, slug généré depuis le titre et modifiable, aperçu du contenu, sélection des articles liés.

## Hors périmètre
Automatisation de publication, éditeur visuel riche, migration des ressources privées, rendu serveur, modification de l'authentification.

## Détails techniques
- Migration : table + GRANT (select anon/authenticated, CRUD authenticated, all service_role), RLS via `has_role(auth.uid(),'admin')`, trigger `updated_at`, index sur slug/status.
- `ResourcesLayout` : choisit `DashboardLayout` si `user`, sinon `PublicLayout` ; `DashboardLayout` inchangé.
- Route `/ressources/:slug` après les routes statiques ; rendu Markdown via `react-markdown` + `remark-gfm` ; JSON-LD via le composant `SEO` étendu (props optionnelles, rétro-compatible).
- Edge Function `sitemap-articles` (publique, XML) ; ligne `Sitemap:` supplémentaire dans `robots.txt`.
- Textes d'interface FR/EN via i18n ; contenus d'articles non traduits (une langue par article).
