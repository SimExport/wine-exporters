# CRM (origine, champs modifiables) et recherche Importateurs — audit et plan

## 1. Origine « Manuel » sur toutes les opportunités

### Ce que montre l'audit
- La colonne `leads.source` existe déjà et elle est bien remplie à la création :
  - `campaign_interest` : ajout depuis les prospects qualifiés d'une campagne (130 lignes)
  - `sourcing` : Recherche sur-mesure (167)
  - `opportunity_direct` / `opportunity_tender` : demandes d'importateurs / appels d'offres (318 + 20)
  - `click`, `interest_form`, `campaign` : imports des campagnes, faits côté admin (55 + 4 + 73)
- **Cause réelle** : tous les ajouts faits par l'utilisateur (campagne, recherche, opportunité, ajout manuel) sont rangés dans la campagne technique « Prospects manuels » (`getOrCreateManualCampaign`), et le CRM affiche le **nom de la campagne** (`prospect.campaigns?.name`) comme origine. D'où le « Manuel » partout. Le CRM n'affiche la vraie `source` que pour `sourcing`.
- Les ajouts réellement manuels (dialogues de création dans Pipeline et Prospects) n'envoient pas de `source` : ils prennent la valeur par défaut de la colonne.

### Correctif
- Valeurs stables existantes conservées, regroupées pour l'affichage :
  - `manual` → « Ajout manuel / Manual entry »
  - `campaign`, `campaign_interest`, `click`, `interest_form` → « Campagne / Campaign » (+ nom de la vraie campagne quand disponible)
  - `sourcing` → « Recherche sur-mesure / Custom search »
  - `opportunity_direct` → « Demande d'importateur / Buyer request »
  - `opportunity_tender` → « Appel d'offres / Tender »
- Une petite fonction commune `getLeadOriginLabel(lead)` + badge d'origine, utilisée dans la carte Kanban, la liste Prospects et la fiche détail, à la place du nom « Prospects manuels ».
- Pour les campagnes : afficher le nom de la campagne réelle via `source_ref` (id campagne) quand `source = campaign_interest`, sinon le nom de la campagne liée si ce n'est pas « Prospects manuels ».
- Dialogues d'ajout manuel (Pipeline, Prospects) : envoyer explicitement `source: 'manual'`.
- Filtre « Campagne » existant inchangé.

### Anciennes données
- Aucune ligne n'a de `source` vide et toutes les sources non manuelles ont déjà leur référence (`source_ref`) : **aucun backfill nécessaire**. On vérifiera simplement la valeur par défaut de la colonne et le nombre de lignes `manual`/nulles avant de conclure ; si des lignes nulles existent, elles seront affichées « Ajout manuel » sans être modifiées.

## 2. CRM réellement modifiable

### Inventaire (fiche prospect)
- Modifiables et enregistrés : coordonnées, actions demandées, montant estimé, raison de perte (via bouton « Modifier »), étape / statut, notes (ajout, édition, suppression), échantillons (ajout, édition, suppression, « marquer envoyés »), rappel (date + note).
- Manquants ou non modifiables : **date d'envoi des échantillons** (aucune colonne), **commande obtenue / infos de commande** au-delà du montant (pas de champ), **prochaine action** visible uniquement dans le rappel, montant et raison de perte cachés hors mode édition selon le statut.
- Droits Supabase vérifiés : l'utilisateur ne peut lire / modifier / supprimer que les prospects rattachés à ses propres campagnes (idem notes et échantillons). Rien de bloquant côté base pour les champs existants ; aucun élargissement de droits.

### Correctif
- Ajout de colonnes sans perte de données sur `leads` : `samples_sent_at` (date), `order_won` (oui/non), `order_amount` (montant), `order_details` (texte), `next_action` (texte), `next_action_at` (date).
- Section « Suivi commercial » dans la fiche : tous ces champs + montant estimé + raison de perte éditables par le propriétaire, enregistrés dans `handleSaveChanges`.
- « Marquer les échantillons envoyés » renseigne aussi `samples_sent_at` (modifiable ensuite).
- Protégés : ids, rattachement campagne, `created_by`, horodatages système, `source`/`source_ref`.
- Textes FR/EN ajoutés.

## 3. Recherche sur la page Importateurs

### Ce que montre l'audit
- La liste est chargée côté serveur, par pays, **10 par page** (`range`), avec comptage total : charger toute la base côté navigateur serait inadapté.

### Correctif
- Barre de recherche au-dessus de la liste du pays sélectionné, avec délai de frappe (~300 ms), retour page 1.
- Requête Supabase combinée au filtre pays : recherche partielle, insensible à la casse, sur société, ville, email (pas de colonne nom de contact dans la base importateurs).
- Insensible aux accents : via une fonction de recherche en base utilisant l'extension `unaccent` (ex. « Copen » → Copenhagen, « Nordic », « Genève »/« Geneve »). L'export et les crédits restent inchangés.

## Risques de régression
- Affichage origine : purement visuel, aucun changement de filtre ni de données.
- Nouvelles colonnes nullables : aucun impact sur les écrans existants, l'export CRM et l'accès MCP.
- Recherche : n'altère pas le filtre pays ni la pagination ; limitée à la liste affichée.

## Détails techniques
- Fichiers : `src/pages/Pipeline.tsx`, `src/pages/Prospects.tsx`, `src/pages/ProspectDetail.tsx`, nouveau `src/lib/lead-origin.ts`, `src/pages/Importers.tsx`, `src/i18n/locales/fr.json` et `en.json`.
- Migration 1 : `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ...` (6 colonnes nullables). Réversible par `DROP COLUMN`.
- Migration 2 : `CREATE EXTENSION IF NOT EXISTS unaccent` + fonction `search_buyer_contacts(_countries text[], _q text, _offset int, _limit int)` renvoyant lignes + total, `SECURITY INVOKER`, requête paramétrée ; aucune policy modifiée.
- Aucune Edge Function modifiée ; RLS `leads`, `sample_items`, `prospect_notes` inchangées.
