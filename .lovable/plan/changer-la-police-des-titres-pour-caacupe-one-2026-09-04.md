# Changer la police des titres pour Caacupe One

## Objectif
Remplacer la police actuelle des titres (Playfair Display) par **Caacupe One** sur toute l'application, en respectant le système de design tokens existant.

## Portée
- Toute l'application : la police de titres (`font-display`) est utilisée dans `LandingPage.tsx` et potentiellement d'autres pages.
- Aucun autre changement visuel (couleurs, tailles, graisses) n'est prévu.

## Étapes d'implémentation

1. **Mettre à jour le chargement Google Fonts dans `index.html`**
   - Remplacer le bloc `<link>` Playfair Display existant par le code Google Fonts fourni pour Caacupe One :
     ```html
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     <link href="https://fonts.googleapis.com/css2?family=Caacupe+One&display=swap" rel="stylesheet">
     ```

2. **Mettre à jour le token `font-display` dans `tailwind.config.ts`**
   - Remplacer `'"Playfair Display"'` par `'"Caacupe One"'` dans `theme.extend.fontFamily.display`.
   - Conserver les fallbacks Georgia / serif.

3. **Vérifier les références restantes à Playfair Display**
   - Rechercher toute référence en dur à `Playfair Display` dans le code (CSS inline, styles, classes) et les remplacer si nécessaire.

4. **Vérification visuelle**
   - S'assurer que les titres de la landing page et des pages internes s'affichent correctement avec Caacupe One.
   - Vérifier le rendu sur desktop et mobile.

## Fichiers concernés
- `index.html`
- `tailwind.config.ts`

## Non concernés
- Aucune page ou composant React ne sera modifié (ils utilisent déjà `font-display`).
- Aucune table, Edge Function, ou logique métier.
