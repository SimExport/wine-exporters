# Ajouter la page Ressources — première étape

## Objectif
Créer une nouvelle page « Ressources » accessible depuis la navigation du dashboard, avec un hero compact et 4 cartes de navigation principales. Aucune page de détail, article, vidéo ou filtre n’est créée à ce stade.

## Ce qui sera livré

1. **Route et navigation**
   - Nouvelle route `/ressources` dans `src/App.tsx`, wrappée dans `DashboardLayout`.
   - Entrée « Ressources » ajoutée dans la navigation principale de `AppSidebar.tsx` et de `MobileNav.tsx`, entre « À venir / Roadmap » et « Aide / Help ».
   - Icône : `BookOpen` (lucide-react), cohérente avec l’aide.

2. **Page `src/pages/Resources.tsx`**
   - Hero compact : titre + sous-titre, sans image de fond ni effet visuel.
   - Grille responsive : 1 colonne sur mobile, 2 colonnes à partir de `md`.
   - 4 cartes utilisant le composant `Card` existant, avec :
     - un titre de carte en `font-display` / `text-lg` / `font-semibold` ;
     - une description en `text-muted-foreground` ;
     - une ligne de « sujets » en petit texte (séparés par un point médian ·) ;
     - un CTA discret visuel / non fonctionnel pour l’instant, structuré (champ `href` optionnel dans la config de carte) pour accueillir un lien ou une action à la prochaine itération sans refactor.
   - SEO : balise `<title>` et meta description via le composant `SEO` existant.

3. **Traductions i18n**
   - Clés ajoutées dans `src/i18n/locales/fr.json` et `src/i18n/locales/en.json` :
     - `nav.resources`
     - `seo.resources.title` / `seo.resources.description`
     - `resources.title` / `resources.subtitle`
     - `resources.cards.<slug>.{title,description,topics,cta}` : clés explicites par carte (`contactImporter`, `followCampaign`, `followProspect`, `moveOpportunity`), `topics` en tableau de chaînes.
   - Les textes anglais fournis par l’utilisateur sont utilisés tels quels.

4. **Design system**
   - Couleurs, rayons, bordures et espacements via les tokens Tailwind existants (`bg-primary/10`, `text-primary`, `border`, `text-muted-foreground`, etc.).
   - Pas de couleur hardcodée, pas de dégradé marketing, pas d’animation excessive.
   - La page reste dans l’esprit dashboard (fond `bg-background`, pas de hero pleine largeur).

## Ce qui n’est pas dans le périmètre
- Aucune page de ressource détaillée.
- Aucun article, vidéo, filtre, recherche ou logique de favoris.
- Aucune modification des pages existantes en dehors de l’ajout de la route et de l’entrée de navigation.

## Fichiers concernés
- `src/App.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/MobileNav.tsx`
- `src/pages/Resources.tsx` (création)
- `src/i18n/locales/fr.json`
- `src/i18n/locales/en.json`

## Validation
- `bunx tsgo -p tsconfig.app.json --noEmit` doit passer.
- Vérification visuelle rapide dans le preview : hero lisible, 4 cartes en grille 2×2 sur desktop, 1 carte par ligne sur mobile, bascule FR/EN fonctionnelle.
