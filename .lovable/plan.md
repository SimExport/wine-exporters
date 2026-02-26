
## Plan : Enrichissement CRM Kanban + CRM Liste

### Analyse de l'existant

**Pipeline.tsx (Kanban)** — chaque carte contient :
- Nom société + contact
- Pays (icône MapPin)
- Badges "actions demandées" (max 2 + overflow)
- Nom de la campagne
- ❌ Pas d'indicateur de temps / inactivité
- ❌ Pas de tags colorés personnalisés

**Prospects.tsx (Liste)** — chaque ligne contient :
- Date ajout / Campagne / Société / Contact / Pays / Actions / Statut / Dernière MAJ
- ❌ Pas d'indicateur d'inactivité visuel (juste une date)
- ❌ Pas de tags colorés

### Approche choisie : pas de migration DB

Les tags sont stockés dans `owner_notes` (champ texte existant) ? Non — pour ne pas perturber les notes. La meilleure approche est d'utiliser le champ `status` (text, nullable) de la table `leads` qui est distinct de `prospect_status`. Ce champ `status` est déjà là et actuellement peu utilisé côté UI. Il peut stocker : `'hot'`, `'warm'`, `'cold'`, `null`.

Ainsi : **aucune migration DB nécessaire**. On réutilise le champ `status` existant.

---

### Changements détaillés

#### 1. Constantes partagées — tags de température

```ts
const LEAD_TAGS = [
  { key: 'hot',   label: 'Chaud',    color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'warm',  label: 'Tiède',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'cold',  label: 'Froid',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
]
```

#### 2. Fonction utilitaire d'inactivité

```ts
function getInactivityInfo(lastActivityAt?: string): { label: string; isAlert: boolean } {
  if (!lastActivityAt) return { label: 'Aucune activité', isAlert: false }
  const days = differenceInDays(new Date(), new Date(lastActivityAt))
  return {
    label: days === 0 ? "Aujourd'hui" : `Il y a ${days}j`,
    isAlert: days >= 15
  }
}
```

#### 3. Mise à jour du tag depuis la carte Kanban

Un petit menu déroulant sur la carte (3 points ou clic sur le tag) permettra de changer le tag `status`. La mise à jour se fait via `supabase.from('leads').update({ status: ... })`.

---

### Modifications fichier par fichier

**`src/pages/Pipeline.tsx`**

Sur chaque carte Kanban, ajouter :

1. **Tag de température** : petit badge coloré en haut à droite de la carte. Cliquable pour cycler entre `hot → warm → cold → null` avec un simple clic, ou afficher un menu. On opte pour un **DropdownMenu** simple.

2. **Indicateur d'inactivité** : en bas de la carte, ligne discrète :
   - `🕐 Dernière action : il y a 5j` (texte gris)
   - Si ≥ 15 jours → texte orange + icône `AlertTriangle` pour attirer l'attention

```text
┌─────────────────────────────┐
│ ⠿  Caves Martin        🔴   │  ← tag "Chaud" en haut droite
│    Jean Dupont              │
│    🗺 France                │
│    [Échantillons] [+1]      │
│    Campagne Été 2025        │
│    🕐 il y a 5j             │  ← indicateur inactivité
└─────────────────────────────┘
```

Si ≥ 15 jours :
```text
│    ⚠️ il y a 18j            │  ← texte orange/rouge
```

**`src/pages/Prospects.tsx`**

1. **Colonne "Tag"** : nouvelle colonne entre "Statut" et "Dernière MAJ" avec le badge coloré modifiable via un `Select` inline ou un `DropdownMenu`.

2. **Colonne "Dernière MAJ"** : transformer l'affichage de la date en badge relatif :
   - < 15j → `"il y a Xj"` en gris discret
   - ≥ 15j → badge orange `"⚠ il y a Xj"` pour alerter

---

### Fichiers à modifier

1. **`src/pages/Pipeline.tsx`** :
   - Ajouter imports : `differenceInDays`, `AlertTriangle`, `DropdownMenu`
   - Ajouter fonction `getInactivityInfo`
   - Ajouter constante `LEAD_TAGS`
   - Ajouter handler `handleTagUpdate(prospectId, tag)`
   - Modifier le rendu des cartes Kanban

2. **`src/pages/Prospects.tsx`** :
   - Ajouter imports : `differenceInDays`, `AlertTriangle`, `DropdownMenu`
   - Ajouter `status` dans l'interface `Prospect`
   - Ajouter constante `LEAD_TAGS` (partagée)
   - Ajouter handler `handleTagUpdate`
   - Modifier la ligne du tableau : nouvelle colonne tag + colonne inactivité enrichie

Aucune modification de DB requise — on utilise le champ `status` (text) déjà présent dans `leads`.
