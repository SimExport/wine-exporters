## Diagnostic

La recherche sur-mesure de `vin@maison-kieffer.com` (id `9f555fab-6312-40bc-b5d4-f8bec0b5a100`, marché IT, créée le 19/05) est restée en `pending` car elle a été soumise depuis la page **Importateurs** (`src/pages/Importers.tsx`), et ce flux **n'appelle pas** la fonction `process-sourcing-request` après l'insert — contrairement au flux de `src/pages/SourcingRequests.tsx` (ligne 187) qui, lui, déclenche bien le traitement automatique.

Résultat : insert OK + email admin OK, mais aucun traitement automatique.

## Plan

1. **Corriger `src/pages/Importers.tsx`** (`handleSourcingSubmit`)
   - Après l'insert et la notification admin, ajouter un appel non-bloquant :
     ```ts
     supabase.functions.invoke('process-sourcing-request', {
       body: { requestId: inserted?.id },
     }).catch((e) => console.error('process-sourcing-request failed', e));
     ```
   - Aligne le comportement sur celui de `SourcingRequests.tsx`.

2. **Relancer manuellement la demande en attente** pour Maison Kieffer
   - Appel direct de l'edge function `process-sourcing-request` avec `requestId = 9f555fab-6312-40bc-b5d4-f8bec0b5a100` pour qu'elle passe en traitement maintenant.

3. **Vérification**
   - Lire les logs de `process-sourcing-request` pour confirmer l'exécution.
   - Re-query `sourcing_requests` pour s'assurer du changement de statut.

Aucun changement de schéma ou de RLS nécessaire.
