## Objectif

Ajouter un export CSV des importateurs du pays sélectionné sur `/importateurs`, gouverné par un nouveau quota mensuel `export_credits` (500/mois) appliqué uniquement aux utilisateurs avec un plan actif (paid).

## Base de données — migration

Sur la table existante `public.user_credits` :
- Ajouter colonne `export_credits integer NOT NULL DEFAULT 500`
- Mettre à jour les lignes existantes : `UPDATE public.user_credits SET export_credits = 500`

Ajouter une fonction `public.consume_export_credits(_count integer)` (SECURITY DEFINER) :
- Vérifie `auth.uid()`
- Décrémente `export_credits` de `_count` si `export_credits >= _count`
- Retourne le nouveau solde, ou `-1` si solde insuffisant

Le reset mensuel : la table possède déjà `next_reset_date` et `subscription_start_date`. Aucun job n'effectue actuellement le reset côté serveur dans ce qu'on voit (les colonnes par défaut sont à 1). Pour rester minimal et conforme à "ne pas modifier les composants existants", on ajoute un trigger/fonction `reset_export_credits_if_due()` invoqué côté client à chaque `fetchCredits` via une RPC `public.ensure_export_credits_reset()` : si `now()::date >= next_reset_date`, remettre `export_credits = 500` et avancer `next_reset_date` d'un mois. Cette RPC n'altère pas `campaign_credits`/`search_credits` (déjà gérés ailleurs).

## Hook `src/hooks/useCredits.tsx`

- Étendre `UserCredits` avec `export_credits: number`
- Inclure `export_credits` dans le `select`
- Avant le select, appeler `supabase.rpc('ensure_export_credits_reset')` (ignore l'erreur si fonction absente pendant le déploiement)
- Ajouter `consumeExportCredits(count: number)` qui appelle la RPC `consume_export_credits`
- Exposer `exportCredits`, `consumeExportCredits`, et un `noCreditsMessage('export')`
- Ajouter clés i18n `credits.noCreditsExport`

## Page `src/pages/Importers.tsx`

Modifier uniquement cette page :

1. **Affichage du solde** — sous le sélecteur de pays (à côté du compteur "X contacts"), afficher pour les utilisateurs `hasPaidAccess` :
   `"{exportCredits} / 500 crédits d'export disponibles ce mois-ci"`
   (clé i18n `importers.exportCredits.balance`)

2. **Bouton "Télécharger la liste"** — à droite du compteur de contacts, visible quand `selectedCountry && contacts.length > 0`. Désactivé si `!hasPaidAccess` (tooltip explicatif) ou si `exportCredits <= 0`.

3. **Logique d'export** — remplacer la fonction `exportToCSV` existante :
   - Si `!hasPaidAccess` : toast d'erreur "Réservé aux abonnés"
   - Si `exportCredits <= 0` : toast bloquant avec message de quota épuisé + date de reset
   - Si `totalCount > exportCredits` : ouvrir un `AlertDialog` proposant un export partiel de `exportCredits` lignes (boutons "Télécharger {n} contacts" / "Annuler")
   - Sinon : export complet de `totalCount` lignes
   - Avant le fetch : appeler `consumeExportCredits(nbLignesÀExporter)`. Si retour `ok: false`, abandonner avec toast.
   - Fetch des contacts via `supabase.from('buyer_contacts').select(...).in('country', country.dbAliases).order('company_name').limit(nbLignesÀExporter)`
   - Génération CSV identique à l'existant (mêmes 9 colonnes)
   - Toast de succès : "{n} contacts exportés. Solde restant : {remaining}"

4. **i18n** — clés ajoutées sous `importers.exportCredits` (FR/EN) : `balance`, `download`, `paidOnly`, `quotaExhausted`, `partialTitle`, `partialDescription`, `partialConfirm`, `successWithRemaining`.

## Hors scope

- Aucun changement à `Profile`, `Billing`, `AppSidebar`, autres pages, ni aux crédits `campaign_credits`/`search_credits`.
- Aucune modification de la table `buyer_contacts` ni de ses RLS.
- Aucun job cron : le reset mensuel est déclenché paresseusement via la RPC au chargement de `useCredits`.

## Détails techniques

- Migration SQL en une transaction : `ALTER TABLE … ADD COLUMN`, `UPDATE`, `CREATE OR REPLACE FUNCTION consume_export_credits`, `CREATE OR REPLACE FUNCTION ensure_export_credits_reset`, `GRANT EXECUTE … TO authenticated`. Pas de nouvelle table → pas de policies à créer.
- `consume_export_credits` est atomique (UPDATE conditionnel + RETURNING) pour éviter les courses entre clics rapides.
- Limite Supabase de 1000 lignes par requête : passer explicitement `.limit(nbLignesÀExporter)` (max 500 ici, donc OK).