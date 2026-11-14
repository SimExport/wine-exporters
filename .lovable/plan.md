# Admin campagnes : séparer « À valider », « Planifiées », « Envoyées »

## Constat (vérifié)
- Valider une campagne personnalisée appelle la RPC `approve_campaign_for_queue` (dans `CampaignReviewSheet.tsx`) : elle insère une ligne `campaign_send_queue` (state `queued`) mais laisse `campaigns.status = 'pending_validation'`. Le statut ne passe à `active` qu'au moment de l'envoi Brevo par `send-queued-campaign` (1/jour, 08:00 UTC).
- `AdminCampaigns.tsx` filtre uniquement sur `campaigns.status` (défaut `['pending_validation']`) et ne lit jamais la file : les campagnes en file restent donc dans « En attente de validation ».
- Données actuelles : 7 campagnes `pending_validation` + file `queued` (déjà validées), 2 `active` + `sent`, 10 `results` + `sent`, 54 `results` sans file (envoi historique).
- Plusieurs Edge Functions (`send-queued-campaign`, `notify-campaign-validated`, `save-campaign-email`, `send-campaign`, `custom-campaign-send`) exigent `status = 'pending_validation'` pour une campagne en file. Changer ce statut casserait l'envoi.

## Solution retenue : catégorie admin calculée, aucun changement de statut
Ne rien changer en base ni dans le workflow. L'admin calcule une « catégorie de revue » en combinant `campaigns.status` et `campaign_send_queue.state` :

```text
pending_validation + pas de ligne file          -> À valider
pending_validation + file 'failed'              -> À valider (badge « Programmation échouée »)
pending_validation + file 'needs_review'        -> À vérifier (envoi incertain, contrôle Brevo)
pending_validation + file 'queued' / 'sending'  -> Planifiées (avec date estimée)
pending_validation + send_error/brevo id/lock   -> À vérifier (règles existantes sendState)
active / sending / results (envoi confirmé)     -> Envoyées
draft, archived, failed                         -> Autres (filtre existant)
```

- « Planifiée » n'est affichée QUE si une ligne file existe avec `queued`/`sending`, relue en base après la RPC. Si la RPC échoue ou si la relecture ne trouve pas la ligne, la campagne reste « À valider » avec un message d'erreur.
- Les 7 campagnes déjà en file passent automatiquement dans « Planifiées » sans revalidation ni écriture (la catégorie est dérivée des lignes existantes).
- Côté vignerons : aucun changement (ils continuent à voir `pending_validation` = « En validation »).

## Changements prévus (frontend admin uniquement)
1. **Nouveau `src/lib/admin-campaign-category.ts`** (sans React) : `adminCategory(campaign, queueRow)` et `countByCategory(...)`, réutilisant `sendState` de `campaign-send-state.ts`.
2. **`src/pages/AdminCampaigns.tsx`** :
   - `fetchCampaigns` charge aussi `campaign_send_queue (campaign_id, state, approved_at, error)` (lecture admin déjà utilisée par le panneau de revue).
   - Onglets avec compteurs : À valider (défaut) · À vérifier · Planifiées · Envoyées · Toutes ; filtres winery/période/marché/recherche conservés. Le sélecteur de statut existant reste pour les autres statuts (brouillon, archivé…).
   - Compteurs calculés sur la même liste que les onglets (après filtres hors onglet) pour rester cohérents.
   - Badge « Planifiée — envoi estimé le … » sur les lignes en file (même estimation que le panneau).
3. **`src/components/admin/CampaignReviewSheet.tsx`** : après `approve_campaign_for_queue` réussie, relire la ligne file puis appeler le rafraîchissement parent (déjà existant via `fetchCampaigns`) pour que la campagne sorte immédiatement d'« À valider ». Même chose après `cancel_campaign_queue` (retour dans « À valider »).
4. **Traductions FR/EN** admin (`adminCampaigns.tabs.*`, `scheduledBadge`, `scheduleFailed`).

Hors périmètre / inchangé : RPC, Edge Functions, cron 08:00 UTC, règle 1 envoi/jour Paris, Brevo, notifications, relances, campagnes legacy (`create-campaign`), pages vignerons, schéma, RLS.

## Effets de bord à surveiller
- Une campagne legacy validée via `create-campaign` passe directement `active` : elle apparaît dans « Envoyées » (comportement actuel conservé).
- Fenêtre `sending` (worker en cours) : classée « Planifiées » avec mention « envoi en cours » ; jamais de bouton Valider possible (garde-fous existants `queueBlocks`/`canStartSend`).
- Une campagne `queued` annulée revient dans « À valider ».
- Si la lecture de la file échoue côté admin : afficher une erreur et ne classer aucune campagne en « Planifiées » (repli sûr = « À valider »).

## Tests
- `admin-campaign-category.test.ts` (bun) : un cas par ligne du tableau ci-dessus, dont : RPC échouée/sans ligne → À valider ; `failed` → À valider ; `needs_review` → À vérifier ; `queued` → Planifiées ; `active`/`results` → Envoyées ; compteurs = somme des onglets.
- Tests existants rejoués : `queue-worker_test.ts`, `campaign-send-state`, tests campagne ; typecheck + build.
- Vérification lecture seule en base : les 7 campagnes en file comptées en « Planifiées », 0 écriture.
- Non testable sans compte admin connecté dans le navigateur : à signaler si la session admin n'est pas disponible. Aucun envoi réel déclenché.
