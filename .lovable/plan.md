# Menu de navigation mobile responsive

## Problème constaté

Sur mobile, la barre latérale de navigation (sidebar) est réduite à une simple barre d’icônes sans libellés. Les principaux liens — Recherches, Campagnes, Opportunités, Pipeline, Profil, Paramètres, etc. — ne sont pas lisibles et semblent « cachés ». L’utilisateur ne peut pas accéder aux différents onglets de l’application.

## Objectif

Ajouter un menu déroulant mobile avec un bouton « trois tirets » (hamburger) qui ouvre un tiroir (bottom sheet) contenant l’intégralité de la navigation, avec libellés et icônes, sur petits écrans. Conserver la sidebar desktop inchangée.

## Ce qui va changer

- Un bouton menu hamburger visible uniquement sur mobile, dans un petit header fixe en haut de l’écran.
- Au clic, un `Drawer` (tiroir depuis le bas) s’ouvre avec la liste complète des liens : Dashboard, Profil, Importateurs, Campagnes, Recherches, Opportunités, CRM/Pipeline, Roadmap, Aide, Paramètres, Facturation, et les liens admin si l’utilisateur est admin.
- Les liens actuels sont mis en valeur visuellement.
- La sidebar `AppSidebar` reste utilisée en desktop. Sur mobile, elle est masquée (ou réduite à son minimum) pour éviter la duplication avec le menu hamburger.
- Ajout des clés de traduction FR/EN dans les fichiers de locales.

## Détails techniques

- `src/components/MobileNav.tsx` : nouveau composant utilisant `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle` et les icônes déjà importées dans `AppSidebar`. Il expose un `Menu` (hamburger) flottant ou dans un header.
- `src/components/DashboardLayout.tsx` : intégrer `MobileNav` et conditionner son affichage à `< sm` (via `useIsMobile` existant). Masquer la sidebar sur mobile (`hidden md:block` ou `mdOnly` sur le `SidebarProvider`).
- `src/components/AppSidebar.tsx` : aucun changement de contenu, juste une classe conditionnelle pour ne pas s’afficher en mobile.
- `src/i18n/locales/fr.json` et `en.json` : ajouter les clés `mobileNav.menu`, `mobileNav.title`.
- Vérification responsive : capture Playwright en 393x706 sur `/dashboard` pour s’assurer que le menu hamburger est visible, qu’il s’ouvre et que tous les liens sont lisibles.

## Non inclus

- Aucune modification de la structure des routes, de la logique d’authentification ou des pages existantes.
- Aucun changement de design system (couleurs, typographie) ; on réutilise les composants et tokens existants.
