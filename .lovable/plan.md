
# Page Roadmap interactive avec systeme de vote

## 1. Base de donnees

Creation d'une table `roadmap_votes` avec les colonnes suivantes :
- `id` (UUID, cle primaire)
- `user_id` (UUID, reference auth.users)
- `feature_id` (text, identifiant de la fonctionnalite)
- `created_at` (timestamp)
- Contrainte UNIQUE sur (user_id, feature_id) pour empecher les doublons

Politiques RLS :
- SELECT : l'utilisateur peut voir ses propres votes (`auth.uid() = user_id`)
- INSERT : l'utilisateur authentifie peut voter (`auth.uid() = user_id`)
- DELETE : l'utilisateur peut retirer son vote (`auth.uid() = user_id`)

## 2. Page Roadmap.tsx

Nouvelle page `/roadmap` avec :

**En-tete :**
- Titre : "Fonctionnalites a venir"
- Sous-titre : "Decouvrez nos projets pour accelerer votre export. Votez pour vos outils preferes !"

**Grille de cartes** (6 fonctionnalites) :

| ID | Titre | Icone | Description |
|----|-------|-------|-------------|
| marketplace | Marketplace | Store | Connectez-vous directement aux importateurs via un catalogue de cuvees digital et interactif. |
| tenders | Appels d'Offres | Megaphone | Un outil simple qui liste tous les appels d'offres disponibles et vous propose d'y repondre de maniere intuitive. |
| calculator | Calculateur Prix Export | Calculator | Sachez exactement a combien vendre vos vins sur quels marches en integrant taxes et marges. |
| tech-sheets | Generateur Fiches Techniques | FileText | Creez des fiches techniques modernes, adaptees et traduites automatiquement en plusieurs langues. |
| market-guides | Fiches Marches | Globe | Guides detailles par pays pour savoir ou prospecter et comment penetrer le marche. |

**Systeme de vote par carte :**
- Bouton "Je suis interesse" avec icone ThumbsUp dans le CardFooter
- Au clic : insertion dans `roadmap_votes`, le bouton passe a "Vote !" (desactive, couleur differente), toast de confirmation
- Au chargement : verification des votes existants pour afficher l'etat correct

## 3. Navigation - Sidebar

Ajout d'une entree dans `navigationItems` du fichier `AppSidebar.tsx` :
- Label : "A venir"
- Icone : Rocket
- URL : `/roadmap`
- Position : juste avant le groupe "Configuration" (apres CRM - Kanban)

## 4. Routing

Ajout de la route `/roadmap` dans `App.tsx` avec le `DashboardLayout`.

## Details techniques

**Fichiers modifies :**
- `src/components/AppSidebar.tsx` : ajout de l'import Rocket et de l'entree sidebar
- `src/App.tsx` : ajout de la route /roadmap

**Fichiers crees :**
- `src/pages/Roadmap.tsx` : page complete avec grille de cartes, logique de vote via Supabase, verification des votes existants

**Migration SQL :**
- Creation de la table `roadmap_votes` avec RLS
