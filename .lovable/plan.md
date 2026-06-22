## Ajouter 3 nouveaux champs personnalisables aux cartes Kanban

Étendre la fonctionnalité "Personnaliser" du Pipeline pour inclure trois nouvelles informations optionnelles sur chaque carte lead.

### Nouveaux champs ajoutés au menu de personnalisation
1. **Dernière note interne** — affiche le contenu (tronqué ~2 lignes) de la note la plus récente de `prospect_notes` pour ce lead
2. **Échantillons demandés** — affiche le nombre/liste des échantillons demandés (depuis `sample_items` liés au lead)
3. **Adresse** — affiche l'adresse du contact (depuis `buyer_contacts.full_address` ou champs équivalents sur le lead)

Tous trois seront **décochés par défaut** (comportement actuel inchangé pour les utilisateurs existants).

### Modifications

**`src/pages/Pipeline.tsx`**
- Étendre le type `CardField` avec `'lastNote' | 'samples' | 'address'`
- Ajouter ces 3 entrées dans `ALL_CARD_FIELDS` (non inclus dans `DEFAULT_CARD_FIELDS`)
- Étendre l'interface `Prospect` avec `last_note?: string`, `samples_count?: number` (+ éventuellement liste courte), `address?: string`
- Étendre la requête Supabase qui charge les leads pour récupérer ces données :
  - jointure `prospect_notes` (ORDER BY created_at DESC LIMIT 1 par lead) → dernière note
  - jointure `sample_items` (count + éventuels noms de vins) par lead
  - récupération de l'adresse depuis le contact lié ou champs lead existants
- Ajouter 3 blocs de rendu conditionnel dans la carte, wrappés par `visibleFields.has('lastNote')` etc., avec icônes adaptées (StickyNote, Package, MapPin) et troncature visuelle

**`src/i18n/locales/fr.json` & `src/i18n/locales/en.json`**
- Ajouter sous `pipeline.customize.fields` :
  - `lastNote` → "Dernière note" / "Last note"
  - `samples` → "Échantillons demandés" / "Samples requested"
  - `address` → "Adresse" / "Address"

### Hors scope
- Pas de modification de la vue Liste (`Prospects.tsx`)
- Pas de modification de la base de données
- Persistance toujours via `localStorage` (clé inchangée → les nouveaux champs apparaissent simplement décochés pour les utilisateurs existants)

### Point à confirmer
Pour "Échantillons demandés" : afficher uniquement **le compte** (ex: "3 échantillons demandés") ou **la liste courte** des noms de vins ? Par défaut je partirais sur le compte pour garder la carte compacte.
