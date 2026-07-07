## Objectif

Sur la page campagne côté user, regrouper dans la carte "Prospects qualifiés" **deux sources** :
1. **Répondants formulaire** (`campaign_interested_contacts`) — scores 8-10/10, hautement intéressés
2. **Cliqueurs importés par Claude** (`leads` où `campaign_id = X` et `source = 'click'`) — scores 4-7/10, pertinence variable

Aujourd'hui la carte n'affiche que la source 1.

## Comportement

### Fetch

Dans `CampaignDetail.tsx`, en plus de `fetchInterested`, fetch les cliqueurs :
```
supabase.from('leads')
  .select('id, email, market, source_score, owner_notes, created_at')
  .eq('campaign_id', id).eq('source','click')
```

### Modèle unifié

Adapter `InterestedContact` en type union avec un champ discriminant `origin: 'form' | 'click'`. Mapping cliqueur → carte :
- `company_name` = partie locale de l'email (avant `@`)
- `email` = email
- `country` = `market`
- `score` = `source_score` (4-7)
- `description` = `owner_notes` (contient l'inférence Claude)
- `recommended_actions` = null
- Pas d'`added_to_crm_by` (déjà dans les leads de la campagne)

### Affichage

`InterestedContactsSection` accepte la liste unifiée triée par score décroissant. Sur chaque `ProspectCard` :
- Badge source en haut à droite : "Formulaire" (`default`) ou "Cliqueur" (`outline`) — visuellement distinct du badge score
- Filtre score existant ≥ 8 / ≥ 6 conservé (les cliqueurs 4-7 se retrouvent sous "Tous les scores")
- Nouveau filtre optionnel "Source" : Toutes / Formulaire / Cliqueurs
- **Bouton "Ajouter au CRM"** :
  - `origin='form'` → flow existant inchangé
  - `origin='click'` → pas de bouton, badge d'information "Déjà dans votre CRM" (car les cliqueurs sont insérés directement en tant que leads par la sync admin — ils apparaissent déjà dans le CRM sous la campagne d'origine)
- Compteur en-tête : total combiné + petit split "X formulaire · Y cliqueurs"

### Ordre

Tri par `score` décroissant par défaut : les 10/10 formulaire en premier, puis les 7/10 cliqueurs, etc.

## Fichiers modifiés

- `src/pages/CampaignDetail.tsx` : nouveau fetch cliqueurs, mapping unifié, passage au composant
- `src/components/campaigns/InterestedContactsSection.tsx` : type union `origin`, badge source, filtre source, adapter le rendu du bouton Add
- `src/i18n/locales/fr.json` + `en.json` : clés `interestedContacts.origin.form / origin.click / alreadyInCrm / filterSource.*`

## Hors périmètre

- Pas de changement d'edge function `sync-brevo-campaign` (déjà OK avec le fix précédent)
- Pas de modification du CRM ou de la table `leads`
- Pas de renommage de la carte (elle s'appelle déjà "Prospects qualifiés")
- Pas d'action "supprimer un cliqueur" côté user
