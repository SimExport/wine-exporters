
# Refonte complete de la Landing Page

## Contexte
La page affichee a l'adresse `/` est `LandingPage.tsx` (et non `Index.tsx`). C'est ce fichier qui sera reecrit. Le fichier `Index.tsx` n'est plus utilise dans le routage actuel.

## Fichier modifie
- `src/pages/LandingPage.tsx` : reecriture complete

## Structure de la nouvelle page

### Header (barre fixe)
- Logo ExportVins avec icone Grape
- Boutons "Se connecter" et "Demarrer ma prospection" (liens vers `/auth`)

### Section 1 - Hero
- Titre h1 tres grand avec texte en degrade violet (`text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600`)
- Texte : "La plateforme tout-en-un pour developper vos ventes a l'export."
- Sous-titre descriptif
- Deux boutons : "Demarrer ma prospection" (primaire) + "Voir les tarifs" (outline, ancre `#pricing`)

### Section 2 - Les 3 Piliers
- Titre centre : "L'export simplifie, de la recherche a la commande"
- Grille 3 colonnes avec animations hover (`hover:shadow-lg hover:-translate-y-1`)
- Carte 1 (Database) : "Ou trouver des acheteurs qualifies ?"
- Carte 2 (Mail) : "Comment capter leur attention ?"
- Carte 3 (Kanban) : "Comment ne perdre aucune vente ?"
- Chaque carte avec icone sur fond violet clair

### Section 3 - Preuve et Expertise
- Banniere large sur fond violet clair
- Titre : "L'humain au coeur de la tech."
- Texte rassurant sur l'equipe d'experts

### Section 4 - Tarification (`id="pricing"`)
- Titre : "Un tarif simple et transparent"
- Une seule Card centree avec bordure/glow violet
- Prix : 199 EUR HT/mois (Sans engagement)
- Liste avec icones Check vertes :
  - Acces complet a la base d'importateurs mondiale
  - 1 recherche sur-mesure experte par mois (3 a 5 contacts ultra-qualifies)
  - 1 campagne de prospection par mois (envoi gere par nos soins)
  - Acces illimite au CRM et suivi des leads
  - Fiches marches et strategies d'approche
- Bouton "Creer mon compte" pleine largeur

### Section 5 - Footer
- Texte copyright "ExportVins c 2026 - L'outil de prospection des vignerons."
- Liens basiques (Contact, Mentions legales)

## Details techniques
- Fond global : `bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800`
- Composants utilises : Card, CardContent, Button, Badge (pour un eventuel badge "Sans engagement")
- Icones lucide-react : Grape, Database, Mail, Kanban, CheckCircle2, ArrowRight
- Responsive : grilles en 1 colonne sur mobile, 3 colonnes sur desktop
- Ancre smooth scroll vers `#pricing` pour le bouton "Voir les tarifs"
