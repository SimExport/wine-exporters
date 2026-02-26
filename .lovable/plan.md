
## Plan : Améliorations Micro-UX (3 features)

### Analyse de l'existant

**1. KPIs Campagnes (`Campaigns.tsx`, lignes 947–955)**
Actuellement : affiche des pourcentages conditionnels sous forme de texte brut. Si les stats sont nulles, rien ne s'affiche (donc la cellule est vide → "00" visible probablement côté admin). Besoin : toujours afficher les 3 métriques avec icônes, et un tiret si la campagne est en brouillon.

**2. Importateurs (`Importers.tsx`, lignes 364–380)**
Email affiché comme lien `mailto:`, téléphone comme texte brut. Besoin : petite icône `Copy` cliquable pour copier dans le presse-papier avec feedback visuel (toast ou changement d'icône → `Check`).

**3. Roadmap (`Roadmap.tsx`)**
Actuellement : aucun compteur de votes. Il faut charger le count total de votes par feature_id depuis la table `roadmap_votes` et l'afficher sur chaque carte.

---

### Changements détaillés

#### Feature 1 — KPIs enrichis (`Campaigns.tsx`)

Remplacer la cellule KPI actuelle par un affichage structuré à 3 lignes avec icônes :

```text
👁  0 ouv.     (Eye icon)
🖱  0 clics    (MousePointer icon)
↩  0 rép.     (Reply icon)
```

Logique :
- Si `campaign.status === 'draft'` → afficher `—` (tiret) dans la cellule
- Sinon → afficher les 3 métriques avec icônes + valeurs absolues (`stats_opens ?? 0`, etc.)
- Valeurs en gris discret, icônes en `text-muted-foreground`

Nouveaux imports : `MousePointer`, `Reply` (déjà `Eye` présent)

#### Feature 2 — Boutons copie (`Importers.tsx`)

Ajouter un composant inline `CopyButton` dans le fichier : un petit bouton icon-only qui :
1. Au clic → copie la valeur via `navigator.clipboard.writeText(value)`
2. Affiche temporairement une icône `Check` verte pendant 1.5s, puis revient à `Copy`
3. Taille : `h-3.5 w-3.5`, variant ghost, très discret

Modifications dans le tableau :
- **Email** : garder le lien mailto, ajouter `<CopyButton value={contact.email} />` après
- **Téléphone** : si téléphone exist → afficher le texte + `<CopyButton value={formattedPhone} />`

Nouveaux imports : `Copy`, `Check` (déjà présent potentiellement)

```tsx
// Inline component dans Importers.tsx
const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};
```

#### Feature 3 — Compteurs de votes (`Roadmap.tsx`)

Charger le count de votes par feature depuis `roadmap_votes` :

```ts
// Dans useEffect ou une requête séparée
const { data } = await supabase
  .from("roadmap_votes")
  .select("feature_id");
// Calculer: voteCounts[featureId] = count

const voteCounts: Record<string, number> = {};
data?.forEach(v => {
  voteCounts[v.feature_id] = (voteCounts[v.feature_id] || 0) + 1;
});
```

Afficher sous la description de chaque carte, avant le footer button :
```text
🔥 3 vignerons intéressés
```

Si 0 vote → ne pas afficher le compteur (ou afficher "Soyez le premier !").

---

### Fichiers à modifier

1. **`src/pages/Campaigns.tsx`** — remplacer la cellule KPI (lignes 947–955)
2. **`src/pages/Importers.tsx`** — ajouter `CopyButton` inline + modifier cellules Email et Téléphone
3. **`src/pages/Roadmap.tsx`** — ajouter state `voteCounts`, charger les counts globaux, afficher le compteur sur chaque carte
