## Plan : CSV de contacts intéressés par campagne

### Objectif
Permettre à l'admin d'uploader un CSV de contacts intéressés pour une campagne donnée, et afficher cette liste côté utilisateur dans la page de détail de la campagne, avec un bouton "Ajouter au CRM" par ligne (même pattern que les recherches sur-mesure).

### Format CSV attendu (basé sur l'exemple fourni)
Colonnes : `company_name, email, contact_name, country, score, description, recommended_actions`
- `score` : entier 1-5
- `description` : pitch / résumé du fit
- `recommended_actions` : actions suggérées

### 1. Base de données — nouvelle table

`campaign_interested_contacts`
- `id` uuid PK
- `campaign_id` uuid FK → `campaigns(id)` ON DELETE CASCADE
- `company_name` text NOT NULL
- `email` text
- `contact_name` text
- `country` text
- `score` integer (nullable, 1-5)
- `description` text
- `recommended_actions` text
- `added_to_crm_by` uuid[] (pour marquer côté utilisateur les contacts déjà ajoutés au CRM, par user_id)
- `created_at`, `updated_at`

GRANTS : `authenticated` (SELECT/UPDATE), `service_role` ALL.

RLS :
- SELECT : admin OU propriétaire de la campagne (`EXISTS campaigns WHERE id = campaign_id AND user_id = auth.uid()`)
- INSERT/DELETE : admin uniquement
- UPDATE : propriétaire de la campagne (pour mettre à jour `added_to_crm_by` après ajout au CRM)

### 2. Admin — Page `AdminCampaigns.tsx`

Sur chaque ligne du tableau des campagnes, ajouter un bouton "Importer contacts" (icône `Upload`) qui ouvre un `Dialog` :
- Input `<input type="file" accept=".csv">`
- Parsing client (split CSV simple supportant les guillemets, déjà fait dans `TallyCsvImporter`) ou utiliser `papaparse` si déjà présent — je vérifierai ; sinon parsing manuel inspiré de `TallyCsvImporter.tsx`.
- Aperçu (X lignes détectées) puis bouton "Importer" qui insère en batch dans `campaign_interested_contacts` avec le `campaign_id` de la ligne.
- Toast de succès / erreur.

Aucun autre composant/page modifié.

### 3. Utilisateur — Page `CampaignDetail.tsx`

Ajouter une nouvelle `Card` "Contacts intéressés" sous le grid existant (en `lg:col-span-2`) :
- Affiche un tableau avec colonnes : Société, Contact (nom + email + pays), Score (badge), Description, Actions recommandées, Action.
- Action : bouton "Ajouter au CRM" par ligne, qui réutilise la même logique que `SourcingResultsDialog.addToCrm` :
  - `getOrCreateManualCampaign(user.id)` puis insert dans `leads` avec `source: 'campaign_interest'`, `source_ref: campaign.id`, `source_score: score`, `source_relevance: description`, `country`, `company_name`, `email`.
  - Marquer la ligne comme ajoutée (badge "Ajouté") et persister via UPDATE de `added_to_crm_by` (array append) pour que le statut soit conservé d'une visite à l'autre.
- Si la campagne n'a aucun contact intéressé, la carte n'est pas affichée.

### 4. i18n
Ajouter clés FR/EN :
- `adminCampaigns.interestedContacts.*` : `importBtn`, `dialogTitle`, `fileLabel`, `previewCount`, `import`, `success`, `error`, `invalidCsv`, `missingColumns`
- `campaigns.detail.interestedContactsCard`, `campaigns.detail.interestedContacts.*` : titres de colonnes, `addToCrm`, `added`, `empty`

### Hors scope
- Aucune modification des autres pages, tables, ou composants existants.
- Pas de modification de `SourcingResultsDialog`, `CRM`, `Prospects`, etc.
- Pas de traitement serveur (parsing en client, insert direct via RLS).

### Détails techniques
```text
src/pages/AdminCampaigns.tsx
  + bouton "Importer contacts" par ligne + state dialogOpenForCampaignId
  + composant inline (ou dans un nouveau fichier src/components/admin/CampaignInterestedContactsUpload.tsx)

src/pages/CampaignDetail.tsx
  + useEffect fetch from campaign_interested_contacts where campaign_id = id
  + nouvelle Card avec table et bouton "Ajouter au CRM"
```

Si vous préférez un fichier séparé pour le composant d'upload admin plutôt qu'inline, je créerai `src/components/admin/CampaignInterestedContactsUpload.tsx` — cela reste dans le scope autorisé (ajout uniquement, pas de modification d'autres composants).