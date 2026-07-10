## Ajout manuel d'une demande directe (admin)

Permettre à l'admin de créer manuellement une opportunité "Demande directe" depuis la page **Opportunités Admin**, en plus de l'import Tally CSV.

### UI

Dans `src/pages/AdminOpportunities.tsx`, onglet **Demandes directes (Tally)** :
- Ajouter un bouton **"+ Ajouter manuellement"** à côté de `TallyCsvImporter` (au-dessus de `ImporterRequestsList`).
- Ouvre un nouveau composant `ImporterRequestCreateDialog` (copie simplifiée de `ImporterRequestEditDialog`) avec les champs :
  - Nom, Société, Pays, Email, Téléphone
  - Types de vin (FR/EN + brut), Origines (FR/EN + brut), Volume (FR/EN + brut), Message (FR/EN + brut)
  - Statut (défaut `published`)
- Bouton **"Auto-traduire"** qui appelle `translate-opportunity-fields` pour remplir FR/EN à partir des champs bruts.
- À l'enregistrement : `insert` dans `importer_requests`, puis refresh de la liste.

### Données

Insertion dans `importer_requests` avec :
- `source = 'manual'` (nouvelle valeur, à côté de `tally`)
- `status = 'published'` par défaut
- `submitted_at = now()`
- pas de `tally_response_id` (nullable)

Vérifier au préalable les colonnes NOT NULL de `importer_requests` via `supabase--read_query` avant d'écrire l'insert, pour ajuster les valeurs par défaut si besoin. Aucune migration prévue (les policies admin existantes couvrent déjà l'insert).

### Hors périmètre

- Pas de modification du flux Tally CSV ni de la liste existante.
- Pas d'ajout manuel côté "Appels d'offres (PDF)" (peut être demandé séparément).
- Pas d'envoi de notification automatique — l'admin utilisera le bouton "Notifier les utilisateurs" existant.

### Fichiers touchés

- `src/pages/AdminOpportunities.tsx` (bouton + state dialog)
- `src/components/admin/ImporterRequestCreateDialog.tsx` (nouveau)
