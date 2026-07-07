## Contexte

Sur la campagne "Summer 2026" :
- **Stats sont bien synchro'd en base** : `stats_opens=387`, `stats_clicks=18` (données Brevo).
- **Aucun cliqueur importé** (0 leads avec `source='click'`).

## Bugs identifiés

### 1. Import des cliqueurs échoue silencieusement

Les 18 emails ont bien été récupérés depuis Brevo, mais chaque `INSERT` dans `leads` échoue avec :
```
null value in column "market" of relation "leads" violates not-null constraint
```
Colonne `leads.market` obligatoire, jamais renseignée par `sync-brevo-campaign`. Résultat renvoyé au front : `imported_leads: 0` sans surfacer l'erreur.

**Correctif** : dans `supabase/functions/sync-brevo-campaign/index.ts`, déduire un `market` par défaut lors de l'insert (dans l'ordre) :
1. `campaign.target_markets[0]` si présent
2. sinon domaine TLD de l'email (`.au` → `Australia`, `.nl` → `Netherlands`, `.dk` → `Denmark`, `.com` → `Unknown`, etc.) via petit mapping
3. fallback `"Unknown"`

Sélectionner aussi `target_markets` dans la requête campagne. Log + retour d'un compteur `failed` si des inserts échouent encore.

### 2. Stats affichées comme pourcentage alors que ce sont des compteurs bruts

Brevo renvoie `uniqueViews`/`clickers` : ce sont des **nombres** d'unique openers/clickers, pas des taux. L'UI les affiche en `%` :

- `src/pages/CampaignDetail.tsx:431` → `${stats_opens} %` (afficherait "387 %")
- `src/components/admin/CampaignStatsPopover.tsx` → label "Pourcentage d'ouverture (%)"
- Traductions `campaigns.list.table.opens` à vérifier (Campaigns.tsx utilise `count`)

**Correctif** :
- CampaignDetail : afficher `stats_opens` et `stats_clicks` comme compteurs, plus le **taux calculé** à côté si `audience_estimate > 0` : `{opens} ({(opens/audience*100).toFixed(1)} %)`.
- CampaignStatsPopover : renommer le label "Ouvertures uniques" (compteur) au lieu de "Pourcentage d'ouverture (%)", retirer `max={100}`. Mettre à jour i18n `adminCampaigns.table.openRate` en conséquence (FR + EN).
- Vérifier `campaigns.list.table.opens` : si le libellé dit "% d'ouverture", le passer à "ouvertures".

## Fichiers modifiés

- `supabase/functions/sync-brevo-campaign/index.ts` (fix insert)
- `src/pages/CampaignDetail.tsx` (affichage stats)
- `src/components/admin/CampaignStatsPopover.tsx` (label + validation)
- `src/i18n/locales/fr.json`, `src/i18n/locales/en.json` (labels stats)

## Hors périmètre

- Retry automatique des imports cliqueurs déjà loggés (on relancera le bouton Sync après le fix).
- Modification du schéma `leads` (on garde `market NOT NULL`).
