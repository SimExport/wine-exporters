## 1. Admin `/admin/opportunites` — liste + édition

Ajouter dans chaque onglet (sous l'importeur existant) une **section "Entrées publiées"** listant toutes les lignes de la table correspondante.

### Onglet "Demandes directes"
- Nouveau composant `src/components/admin/ImporterRequestsList.tsx` :
  - `useEffect` → `supabase.from('importer_requests').select('*').order('created_at desc')`.
  - Table compacte (10 lignes / page, pagination simple) : société, pays, email, status, date, bouton **Modifier**.
  - Filtre status (all/published/archived/draft).
- Nouveau composant `src/components/admin/ImporterRequestEditDialog.tsx` :
  - `Dialog` shadcn avec formulaire (react-hook-form + zod existants dans le repo).
  - Champs éditables : `full_name`, `company_name`, `country`, `email`, `phone`, `wine_styles`, `origins`, `volume`, `requirements` (Textarea), `status` (Select : published / draft / archived).
  - Bouton **Enregistrer** → `supabase.from('importer_requests').update(...).eq('id', id)` + toast + refresh callback.
  - Bouton **Supprimer** (avec confirmation simple `window.confirm` pour rester léger).

### Onglet "Appels d'offres"
- Nouveau composant `src/components/admin/TenderRequestsList.tsx` : table (référence, marché, designation, agent.company, deadline_answer, status, Modifier).
- Nouveau composant `src/components/admin/TenderRequestEditDialog.tsx` :
  - Charge la liste `tender_agents` au montage pour alimenter un `Select` (avec option "Créer un nouvel agent" qui ouvre le Dialog agent inline déjà présent dans `TenderPdfImporter`, à extraire dans `src/components/admin/TenderAgentDialog.tsx` réutilisable).
  - Champs : `reference`, `market`, `category`, `designation_origin`, `price`, `available_volume`, `vintage`, `deadline_answer` (input date), `deadline_sample` (input date), `style_profile` (Textarea), `requirements` (Textarea), `agent_id` (Select), `status` (Select).
  - **Enregistrer** → update.
  - **Supprimer** avec confirmation.

### Intégration dans `AdminOpportunities.tsx`
Sous chaque `<TallyCsvImporter/>` / `<TenderPdfImporter/>`, ajouter un séparateur visuel + section "Entrées publiées" avec le nouveau composant. Pas de refactor du flux d'import.

## 2. Page utilisateur `/opportunites` — cartes labellisées

Restructurer `src/pages/Opportunities.tsx`.

### Carte "Demande directe" — lignes labellisées
Layout `space-y-3`, chaque ligne = `<div>` avec label `text-xs uppercase tracking-wide text-muted-foreground` + badges en `flex flex-wrap gap-1.5`.

1. **Header** : drapeau + pays (titre) ⟷ date.
2. **Société** : nom (text-sm font-medium).
3. **Recherche :** un badge par valeur de `wine_styles` (split sur `,` et `/`), pill bordeaux (`bg-primary text-primary-foreground`).
4. **Origine souhaitée :** un badge par valeur de `origins` (split sur `,` et `/`), pill `bg-muted text-primary border border-primary/20`.
5. **Volume :** badge unique, pill `bg-gold text-gold-foreground`.
6. **Message** (si non vide après trim) : `<p className="text-xs italic text-muted-foreground/80">`.

Helper local `splitMulti(s) => s.split(/[,/]/).map(x=>x.trim()).filter(Boolean)`.

### Carte "Appel d'offres" — lignes labellisées
1. **Header** : drapeau + market ⟷ deadline badge (urgence inchangée).
2. **Référence :** valeur mono, **Catégorie :** badge bordeaux.
3. **Origine :** designation_origin en pill `bg-muted text-primary border border-primary/20`.
4. **Prix :** texte simple, **Volume disponible :** pill doré.
5. **Millésime :** pill outline (si présent).
6. **Échantillon attendu :** date (si présent).
7. **Profil / Exigences** (si non vides) : paragraphes secondaires.

Layout en deux colonnes pour les labels courts (label gauche fixe `w-28 text-xs uppercase muted`, contenu droit `flex-1`) — fallback colonne unique sur mobile.

## 3. i18n FR/EN

Ajouter dans `src/i18n/locales/fr.json` et `en.json` un namespace `opportunities` :

```json
"opportunities": {
  "pageTitle": "Importateurs en recherche active",
  "pageSubtitle": "Des acheteurs ont laissé leurs coordonnées pour trouver leur prochain fournisseur. Découvrez aussi les appels d'offres officiels en cours sur les marchés monopoles.",
  "tabs": { "direct": "Demandes directes", "tender": "Appels d'offres" },
  "labels": {
    "search": "Recherche",
    "origin": "Origine souhaitée",
    "volume": "Volume",
    "reference": "Référence",
    "market": "Marché",
    "category": "Catégorie",
    "originDesignation": "Origine",
    "price": "Prix",
    "availableVolume": "Volume disponible",
    "vintage": "Millésime",
    "sampleDeadline": "Échantillon attendu",
    "answerDeadline": "Deadline réponse",
    "styleProfile": "Profil recherché",
    "requirements": "Exigences"
  },
  "actions": {
    "reply": "Répondre",
    "addToCrm": "Ajouter au CRM",
    "added": "Ajouté",
    "viewContact": "Voir les coordonnées",
    "viewAgent": "Voir l'agent"
  },
  "states": {
    "emptyDirect": "Aucune demande directe pour le moment.",
    "emptyTender": "Aucun appel d'offres pour le moment.",
    "closed": "Clôturé",
    "daysLeft": "{{count}}j restants"
  },
  "commissionNotice": "WineExporters ne prend aucune commission sur les demandes directes et appels d'offres. Les coordonnées des importateurs et agents vous sont communiquées directement, à vous de mener la relation.",
  "dialog": {
    "directTitle": "{{company}}",
    "directDescription": "Contactez directement {{name}}. Vous pouvez aussi ajouter cette demande à votre CRM pour la suivre.",
    "tenderTitle": "Agent à contacter",
    "tenderDescription": "Adressez votre offre à l'agent en charge de cet appel d'offres ({{reference}})."
  }
}
```

Traductions EN équivalentes ("Looking for", "Preferred origin", "Volume", "Reference", "Market", "Category", "Origin", "Price", "Available volume", "Vintage", "Sample deadline", "Response deadline", "Style profile", "Requirements", "Reply", "Add to CRM", "Added", "View contacts", "View agent", "No direct requests yet.", "No tenders yet.", "Closed", "{{count}}d left", commissionNotice EN).

Brancher via `useTranslation()` dans `Opportunities.tsx` (les composants admin restent en FR car back-office).

## 4. Hors scope
- Pas de modification des tables `importer_requests` / `tender_requests` / `tender_agents`.
- Pas de modification de la logique d'import CSV/PDF (les composants `TallyCsvImporter` / `TenderPdfImporter` ne changent pas).
- Pas d'autres pages touchées.

## Fichiers
**Nouveaux**
- `src/components/admin/ImporterRequestsList.tsx`
- `src/components/admin/ImporterRequestEditDialog.tsx`
- `src/components/admin/TenderRequestsList.tsx`
- `src/components/admin/TenderRequestEditDialog.tsx`
- `src/components/admin/TenderAgentDialog.tsx` (extrait du flow inline existant pour réutilisation)

**Modifiés**
- `src/pages/AdminOpportunities.tsx` — ajout des deux listes sous les importeurs.
- `src/components/admin/TenderPdfImporter.tsx` — utilise `TenderAgentDialog` extrait (refactor mineur, pas de changement fonctionnel).
- `src/pages/Opportunities.tsx` — restructuration cartes + `useTranslation`.
- `src/i18n/locales/fr.json` + `en.json` — namespace `opportunities` complet.
