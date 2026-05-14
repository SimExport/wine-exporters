## Plan : Section Timeline Roadmap sur la page "À venir"

### Objectif
Ajouter une timeline horizontale visuelle au-dessus des cartes de vote existantes sur la page Roadmap. Elle présente les jalons produit de Mai à Fin 2026 avec un statut visuel (accompli / en cours / à venir).

### Fichiers concernés
- `src/pages/Roadmap.tsx`
- `src/i18n/locales/fr.json`
- `src/i18n/locales/en.json`
- `tailwind.config.ts` (pour l'animation pulse)

### Implémentation détaillée

#### 1. Composant Timeline (`src/pages/Roadmap.tsx`)
Insérer une nouvelle section entre le bloc titre/sous-titre et la grille de cartes.

**Données des étapes (tableau statique, 7 items) :**
| Date | Titre | Statut |
|------|-------|--------|
| Mai 2026 | Lancement de la plateforme | `done` |
| Juin 2026 | Opportunités importateurs | `current` |
| Été 2026 | Générateur de Fiches Techniques | `upcoming` |
| Été 2026 | Fiches Marchés | `upcoming` |
| Automne 2026 | Guides & Vidéos Export | `upcoming` |
| Automne 2026 | Calculateur Prix Export | `upcoming` |
| Fin 2026 | Appels d'Offres | `upcoming` |

**Structure visuelle desktop :**
- Conteneur flex horizontal, `justify-between`, espacement généreux.
- Une ligne horizontale (`div` pleine hauteur fine) en arrière-plan, couleur `muted-foreground/30`.
- Une seconde ligne (`div` superposée) partiellement remplie : largeur en % calculée selon l'index de l'étape `current` (ici ~1/6 de la distance entre le centre du 1er nœud et le centre du 7e).
- Chaque étape = colonne flex centrée.
  - **Date** : texte petit (`text-sm`), `text-muted-foreground`, au-dessus du nœud.
  - **Nœud** : cercle (`w-4 h-4 rounded-full`) positionné sur la ligne.
    - `done` : `bg-primary`
    - `current` : `bg-primary` + animation pulse (`animate-pulse-custom` ou `shadow-lg ring-2 ring-primary` avec pulse)
    - `upcoming` : `border-2 border-muted-foreground/50 bg-background`
  - **Titre** : texte en gras (`font-semibold`), `text-foreground`, en dessous du nœud, centré, largeur fixe (`max-w-[140px]`).

**Responsive :**
- Sur mobile / écran étroit : transformation en layout vertical empilé (flex-col) avec une ligne verticale à gauche. Les nœuds sont alignés sur cette ligne. Le texte date+titre est à droite de la ligne.

**Mention discrète :**
- Sous la timeline, texte `text-xs text-muted-foreground italic` : "Planning prévisionnel, susceptible d'évoluer" (via `t("roadmap.timeline.disclaimer")`).

#### 2. Animations (`tailwind.config.ts`)
Ajouter une keyframe `pulse-ring` dans la section `keyframes` :
```
'pulse-ring': {
  '0%': { boxShadow: '0 0 0 0 hsl(var(--primary) / 0.4)' },
  '70%': { boxShadow: '0 0 0 8px hsl(var(--primary) / 0)' },
  '100%': { boxShadow: '0 0 0 0 hsl(var(--primary) / 0)' },
}
```
Et l'animation correspondante `animate-pulse-ring: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'`.
Appliquer cette classe au nœud `current`.

#### 3. Traductions i18n

**`fr.json` — ajouter sous la clé `roadmap` :**
```json
"timeline": {
  "title": "Notre feuille de route",
  "disclaimer": "Planning prévisionnel, susceptible d'évoluer",
  "status": {
    "done": "Lancé",
    "current": "En cours",
    "upcoming": "À venir"
  },
  "steps": [
    { "date": "Mai 2026", "title": "Lancement de la plateforme" },
    { "date": "Juin 2026", "title": "Opportunités importateurs" },
    { "date": "Été 2026", "title": "Générateur de Fiches Techniques" },
    { "date": "Été 2026", "title": "Fiches Marchés" },
    { "date": "Automne 2026", "title": "Guides & Vidéos Export" },
    { "date": "Automne 2026", "title": "Calculateur Prix Export" },
    { "date": "Fin 2026", "title": "Appels d'Offres" }
  ]
}
```

**`en.json` — ajouter sous la clé `roadmap` :**
```json
"timeline": {
  "title": "Our roadmap",
  "disclaimer": "Tentative schedule, subject to change",
  "status": {
    "done": "Launched",
    "current": "In progress",
    "upcoming": "Coming soon"
  },
  "steps": [
    { "date": "May 2026", "title": "Platform launch" },
    { "date": "June 2026", "title": "Importer opportunities" },
    { "date": "Summer 2026", "title": "Tech Sheet Generator" },
    { "date": "Summer 2026", "title": "Market Reports" },
    { "date": "Fall 2026", "title": "Export Guides & Videos" },
    { "date": "Fall 2026", "title": "Export Price Calculator" },
    { "date": "End 2026", "title": "Tenders" }
  ]
}
```

### Règles de cohérence
- Utiliser exclusivement les tokens du design system (`text-primary`, `bg-primary`, `text-muted-foreground`, `text-foreground`, `border-muted-foreground/50`, etc.). Aucune couleur hexadécimale directe dans le composant.
- Conserver intégralement la logique de vote et les cartes existantes en dessous de la timeline.
- Pas de modification de la base de données ni d'appels API supplémentaires.