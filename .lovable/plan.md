## Objectif
Ajouter une carte pleine largeur "Opportunités" sur `/dashboard`, positionnée entre la grille 2x2 existante et le bloc "État du pipeline". La carte affiche un compteur réel des opportunités publiées (importer_requests + tender_requests, status = 'published') et un lien vers `/opportunites`.

## Fichiers concernés

### 1. `src/pages/Dashboard.tsx`
- **Données** : ajouter un état `opportunitiesCount: number` initialisé à `0`.
- **Requête** : dans le `useEffect` existant, ajouter en parallèle aux requêtes `profiles` et `campaigns` deux appels `count` sur `importer_requests` et `tender_requests`, filtrés sur `status = 'published'`, puis sommer les résultats.
- **Carte** : insérer une nouvelle carte en pleine largeur (`col-span-1 md:col-span-2` ou `w-full` selon le layout) entre la grille 2x2 (`</div>`) et le bloc pipeline strip.
- **Style** : identique aux 4 cartes existantes (bordure `border-border`, fond `bg-card`, padding `p-5`, hover `hover:shadow-md transition-shadow`).
- **Icône** : `Sparkles` de `lucide-react` (cohérent avec la sidebar).
- **Badge** : en haut à droite, format `"{{count}} opportunités disponibles"` / `"{{count}} opportunities available"`, avec la classe `bg-blue-50 text-blue-700 border-blue-200` (info).
- **Description** : "Des importateurs et des appels d'offres officiels recherchent activement des vins comme les vôtres."
- **CTA** : "Explorer les opportunités →" / "Explore opportunities →", lien vers `/opportunites`.

### 2. `src/i18n/locales/fr.json`
Ajouter sous `dashboardPage.hub` :
```json
"opportunities": {
  "title": "Opportunités",
  "desc": "Des importateurs et des appels d'offres officiels recherchent activement des vins comme les vôtres.",
  "cta": "Explorer les opportunités",
  "available": "{{count}} opportunité disponible",
  "available_other": "{{count}} opportunités disponibles"
}
```

### 3. `src/i18n/locales/en.json`
Ajouter sous `dashboardPage.hub` :
```json
"opportunities": {
  "title": "Opportunities",
  "desc": "Importers and official tenders are actively looking for wines like yours.",
  "cta": "Explore opportunities",
  "available": "{{count}} opportunity available",
  "available_other": "{{count}} opportunities available"
}
```

## Implémentation détaillée

### Requête de comptage (Dashboard.tsx)
```typescript
const [opportunitiesCount, setOpportunitiesCount] = useState(0);

// Dans le useEffect, après les Promise.all existants :
const [importerCountRes, tenderCountRes] = await Promise.all([
  supabase.from('importer_requests').select('*', { count: 'exact', head: true }).eq('status', 'published'),
  supabase.from('tender_requests').select('*', { count: 'exact', head: true }).eq('status', 'published'),
]);
const total = (importerCountRes.count ?? 0) + (tenderCountRes.count ?? 0);
setOpportunitiesCount(total);
```

### Structure de la carte
La carte suit exactement le pattern des 4 cartes existantes dans le tableau `cards` : icône dans un rond `bg-secondary/60`, badge en haut à droite, titre, description, lien CTA avec flèche. Elle est insérée comme un élément individuel en pleine largeur entre la grille et le pipeline strip, ou comme 5ème élément de la grille avec `md:col-span-2`.

## Vérification
- Recharger `/dashboard` : le badge doit afficher le total réel d'entrées publiées.
- Cliquer sur le CTA doit naviguer vers `/opportunites`.
- Le switch FR/EN doit traduire titre, description, CTA et badge.

## Hors scope
- Pas de modification de la grille 2x2 existante ni des autres cartes.
- Pas de modification du bloc pipeline strip.
- Pas de modification de la sidebar.