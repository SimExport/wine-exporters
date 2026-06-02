## Problème

Après l'upload d'un rapport dans `/admin/campaigns`, le toast indique que le client va être notifié, mais aucun mail n'est envoyé :
- `campaign_reports.notified_at` reste à `null`
- La fonction `notify-campaign-report` n'a aucun log
- Le composant `AdminCampaignReportUpload` n'invoque jamais la fonction et aucun database webhook n'est configuré

## Correction

Invoquer `notify-campaign-report` directement depuis le client juste après l'insertion réussie dans `campaign_reports`.

### Étapes

1. Dans `src/components/admin/AdminCampaignReportUpload.tsx`, après `insert(...)` réussi :
   - Récupérer la ligne insérée (`.select().single()`) pour avoir l'`id` et `user_id`.
   - Appeler `supabase.functions.invoke('notify-campaign-report', { body: { record: <row> } })`.
   - Si l'appel échoue, afficher un toast d'avertissement ("rapport uploadé mais notification échouée") sans bloquer l'upload.
2. Garder le toast de succès actuel uniquement si la notification a réussi ; sinon afficher un message différencié.

### Vérification

- Re-tester un upload depuis `/admin/campaigns`.
- Vérifier que `notify-campaign-report` apparaît dans les logs Edge Functions.
- Vérifier en base que `campaign_reports.notified_at` est renseigné.
- Vérifier la réception de l'email côté boîte du client test.

## Hors scope

- Pas de modification de la fonction `notify-campaign-report` elle-même (elle fonctionne et met déjà à jour `notified_at`).
- Pas de mise en place de database webhook (l'appel client est suffisant et plus simple à observer).
