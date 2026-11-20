# Reprise des notifications opportunités — 20 novembre 2026

Aucun envoi de test. L'acceptation API ne prouve pas la livraison (notamment le TO suppressed).

Contrôle final en lecture seule : le préchargement séparé est présent, `preload_complete=true`, 15 destinataires acceptés sous l'ID historique et 50 pending, un seul lot accepted, zéro destinataire de test persisté. Rien n'a été envoyé ni publié par cette intervention.

Vérifications : 7 tests Bun à sec, Deno check de la fonction et compilation automatique de la page OK ; SQL : permissions/RLS, blocage avant préchargement, 49+1, acceptés exclus et immuables, blocage d'une réservation en cours ou incertaine, clé stable après échec, fin d'opération et annulation des fixtures. Le navigateur vérifie le bouton et les compteurs avec réponses interceptées, pas une session admin réelle (Supabase externe). Le débordement mobile préexistant d'autres sections n'est pas modifié. Les 72 alertes de sécurité antérieures à ces migrations restent hors périmètre ; aucune nouvelle alerte liée à cette correction.

## Suivi

- `opportunity_notification_operations` : `status` active/completed, `historical`, `preload_complete`, `expected_total`, `created_by`, `completed_at`, dates.
- `opportunity_notification_batches` : `operation_id`, `state`, `idempotency_key`, `resend_id`, `attempted_at`, `accepted_at`, `error_message`, dates.
- `opportunity_notification_recipients` : `operation_id`, `email` normalisé et unique par opération, `batch_id`, `state`, `resend_id`, `accepted_at`, dates.
- RLS : lecture admin uniquement, écritures serveur uniquement. Les quatre RPC de suivi sont exécutables seulement par service_role. Auth getUser + user_roles est vérifiée avant toute lecture ou écriture dans la fonction.

## Ordre avant remise en service

1. Précharger dans une transaction SQL les **15 adresses réellement acceptées** et les **50 réellement non acceptées**. Ne pas déduire les adresses de l'ordre actuel de la liste Auth.
2. Vérifier les compteurs 15/65 acceptés, 50 restants et l'ID Resend historique ; débloquer le préchargement seulement après ces contrôles.
3. Déployer uniquement `notify-new-opportunities` avec son fichier local `delivery.ts` et vérifier le mode `status` (sans envoi). Le secret `RESEND_API_KEY` existe ; `SUPABASE_SERVICE_ROLE_KEY` doit être disponible côté fonction, jamais dans la page.
4. Publier le frontend seulement après le préchargement. La page charge `status` sans envoi. L'ancien bouton sans corps ne déclenche plus de mail sur la nouvelle fonction.
5. L'admin peut ensuite confirmer **Reprendre l'envoi** : les 50 restants seront réservés en lots 49 + 1 BCC, chacun avec 1 TO, et les 15 acceptés restent exclus.

## Préchargement séparé (à compléter, pas à exécuter vide)

Utiliser le mécanisme de migration approuvé pour appliquer ce SQL, en remplaçant uniquement les deux tableaux vides par les adresses réelles. La validation échoue et annule tout tant qu'ils ne contiennent pas exactement 15 et 50 adresses distinctes.

```sql
BEGIN;
DO $$
DECLARE
  accepted_emails text[] := ARRAY[]::text[]; -- 15 adresses prouvées par Resend
  pending_emails text[] := ARRAY[]::text[];  -- 50 adresses du lot refusé
  op uuid := '9c5fb5ee-6794-440f-8115-2e4e22a68ec0';
  historic_batch uuid := 'ca5591a3-3d54-444d-ad7e-684f7d9ab8d1';
BEGIN
  PERFORM 1 FROM public.opportunity_notification_operations WHERE id=op AND status='active' AND NOT preload_complete FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Opération non disponible pour préchargement'; END IF;
  IF cardinality(accepted_emails)<>15 OR cardinality(pending_emails)<>50
     OR (SELECT count(DISTINCT lower(btrim(e))) FROM unnest(accepted_emails||pending_emails) e)<>65
     OR EXISTS(SELECT 1 FROM unnest(accepted_emails||pending_emails) e WHERE e IS NULL OR position('@' IN e)<2)
  THEN RAISE EXCEPTION '65 adresses réelles distinctes requises (15 acceptées + 50 en attente)'; END IF;
  IF EXISTS(SELECT 1 FROM public.opportunity_notification_recipients WHERE operation_id=op)
  THEN RAISE EXCEPTION 'Préchargement déjà commencé : rapprocher avant toute écriture'; END IF;
  INSERT INTO public.opportunity_notification_recipients(operation_id,email,batch_id,state,resend_id,accepted_at)
  SELECT op,lower(btrim(e)),historic_batch,'accepted','01a1fa98-5c18-78cd-b642-73421fcdce86',
         (SELECT accepted_at FROM public.opportunity_notification_batches WHERE id=historic_batch)
  FROM unnest(accepted_emails) e;
  INSERT INTO public.opportunity_notification_recipients(operation_id,email,state)
  SELECT op,lower(btrim(e)),'pending' FROM unnest(pending_emails) e;
  UPDATE public.opportunity_notification_operations SET preload_complete=true WHERE id=op;
END $$;
COMMIT;
```

La date historique 20:14 UTC est approximative, fournie par le diagnostic ; remplacer par la date exacte Resend lors du préchargement si disponible, sans changer son ID.

## Incertitude et reprise

La réservation SQL verrouille l'opération, marque le lot et ses destinataires `indeterminate` **avant** l'appel HTTP et conserve ses adresses et une clé `Idempotency-Key` stable. Un autre appel ne peut pas réserver tant qu'un lot reste incertain. Acceptés = jamais repris. Erreur explicite 4xx (hors 408/409) = failed, reprise du même lot et de la même clé. Timeout/5xx/réponse illisible ou absence d'ID = indeterminate, arrêt et rapprochement manuel ; pas de relance aveugle même après expiration de la fenêtre d'idempotence Resend. Après vérification auprès de Resend, un opérateur SQL peut enregistrer l'acceptation ou l'échec certain via `finish_opportunity_notification_batch`, réservé au serveur. Ne déclarer failed que si l'absence d'acceptation est prouvée. Aucun automatisme de livraison, aucun cron ajouté.

Un nouveau récapitulatif ne peut être créé qu'après acceptation de tous les destinataires du précédent, et confirmation explicite de l'admin. Les destinataires d'une opération sont figés ; les nouveaux inscrits n'entrent pas dans une reprise.