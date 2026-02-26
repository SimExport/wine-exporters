
## Plan : Empty States enrichis avec illustrations et CTA

### Contexte
J'ai analysé les 3 pages concernées. Voici l'état actuel des empty states :

**1. `Campaigns.tsx` (ligne 899-912)** — Déjà bien fait ! Il y a une icône `Target`, un titre, un texte et un bouton CTA. À améliorer visuellement.

**2. `AdminCampaigns.tsx` (ligne 595-598)** — Très basique : juste `"Aucune campagne selon vos filtres."` dans un `div` texte centré, sans icône ni CTA.

**3. `Prospects.tsx` (ligne 615-621)** — Basique : texte conditionnel `"Aucun résultat — modifiez vos filtres."` ou `"Aucun prospect pour l'instant."` sans icône ni CTA.

### Approche
Créer un composant réutilisable `EmptyState` qui accepte : icône, titre, description, et CTA optionnel. L'utiliser dans les 3 pages avec des contextes adaptés.

---

### Composant réutilisable
**`src/components/ui/empty-state.tsx`** — nouveau composant :
```tsx
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}
```

---

### Détail des 3 empty states

**Page Campaigns (utilisateur)** — 2 cas :
- *Aucune campagne* : Icône `Rocket` grisée + "Vous n'avez pas encore de campagne" + bouton "Lancer ma première campagne" → `/create-campaign`
- Déjà existant, à rendre plus visuel

**Page AdminCampaigns** — 1 cas :
- *Aucune campagne selon les filtres* : Icône `SearchX` grisée + "Aucune campagne ne correspond à vos filtres" + bouton "Réinitialiser les filtres" (appelle `resetFilters()`)

**Page Prospects** — 2 cas :
- *Avec filtres actifs* : Icône `SearchX` + "Aucun résultat" + bouton "Effacer les filtres"
- *Sans filtres, aucun prospect* : Icône `Users` grisée + "Vos premiers prospects apparaîtront ici" + bouton "Voir mes campagnes" → `/campaigns`

---

### Fichiers à modifier
1. **Créer** `src/components/ui/empty-state.tsx` — composant générique
2. **Modifier** `src/pages/Campaigns.tsx` — remplacer l'empty state existant par le composant
3. **Modifier** `src/pages/AdminCampaigns.tsx` — remplacer le texte simple
4. **Modifier** `src/pages/Prospects.tsx` — remplacer le texte simple avec 2 variantes
