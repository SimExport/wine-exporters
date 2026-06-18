## Plan : Scroll fluide vers les contacts sur /importateurs

### Objectif
Lorsqu'un utilisateur clique sur un pays (carte ou liste), déclencher un scroll fluide (`behavior: 'smooth'`) vers la section affichant la liste des contacts du pays sélectionné.

### Fichier concerné
- `src/pages/Importers.tsx`

### Modifications

1. **Ajouter une référence (`useRef`)** sur le conteneur englobant la section des contacts (la `Card` principale ou le `div` qui la précède).
2. **Ajouter un `useEffect`** qui observe `selectedCountry`. Dès que sa valeur passe de vide à un pays sélectionné, appeler `scrollIntoView({ behavior: 'smooth', block: 'start' })` sur la référence.
3. **Aucun changement** sur les composants enfants (`CountrySelector`, tables, pagination, etc.) ni sur les pages, tables ou routes.

### Détail technique
```tsx
const contactsSectionRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (selectedCountry && contactsSectionRef.current) {
    contactsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}, [selectedCountry]);
```

Le ref sera posé sur le `div` englobant la sélection de pays + la `Card` des contacts pour que le scroll positionne bien le début de la zone de résultats.

### Hors scope
- Aucune modification des composants existants en dehors de `Importers.tsx`.
- Pas de changement sur les tables, routes, API, ou styles.