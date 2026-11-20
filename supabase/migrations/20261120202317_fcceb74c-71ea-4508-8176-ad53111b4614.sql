REVOKE ALL ON public.opportunity_notification_operations,public.opportunity_notification_batches,public.opportunity_notification_recipients FROM anon,authenticated;
GRANT SELECT ON public.opportunity_notification_operations,public.opportunity_notification_batches,public.opportunity_notification_recipients TO authenticated;
GRANT ALL ON public.opportunity_notification_operations,public.opportunity_notification_batches,public.opportunity_notification_recipients TO service_role;
CREATE INDEX notification_recipients_operation_batch ON public.opportunity_notification_recipients(operation_id,batch_id);
CREATE FUNCTION public.validate_opportunity_notification_preload() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.historical AND NEW.preload_complete AND NOT OLD.preload_complete THEN
  IF (SELECT count(*) FROM public.opportunity_notification_recipients WHERE operation_id=NEW.id)<>65
    OR (SELECT count(*) FROM public.opportunity_notification_recipients WHERE operation_id=NEW.id AND state='accepted' AND resend_id='01a1fa98-5c18-78cd-b642-73421fcdce86' AND batch_id='ca5591a3-3d54-444d-ad7e-684f7d9ab8d1')<>15
    OR (SELECT count(*) FROM public.opportunity_notification_recipients WHERE operation_id=NEW.id AND state='pending' AND batch_id IS NULL)<>50
  THEN RAISE EXCEPTION 'Historical preload requires 15 proven accepted and 50 pending recipients'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_opportunity_notification_preload() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notification_validate_preload BEFORE UPDATE OF preload_complete ON public.opportunity_notification_operations FOR EACH ROW EXECUTE FUNCTION public.validate_opportunity_notification_preload();
-- Dry-run SQL only. All synthetic changes roll back in a PL/pgSQL subtransaction.
DO $$
DECLARE
  op uuid := gen_random_uuid();
  historical_batch uuid := gen_random_uuid();
  b jsonb; retry jsonb; n integer;
BEGIN
  IF has_function_privilege('authenticated','public.claim_opportunity_notification_batch(uuid)','EXECUTE')
     OR has_function_privilege('anon','public.opportunity_notification_summary()','EXECUTE')
     OR has_table_privilege('authenticated','public.opportunity_notification_recipients','INSERT')
     OR NOT has_function_privilege('service_role','public.claim_opportunity_notification_batch(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'FAIL: privileges'; END IF;
  IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.opportunity_notification_operations'::regclass,'public.opportunity_notification_batches'::regclass,'public.opportunity_notification_recipients'::regclass) AND NOT relrowsecurity)
  THEN RAISE EXCEPTION 'FAIL: RLS'; END IF;
  BEGIN
    -- MVCC isolates this temporary change; exception rollback restores the real active operation.
    UPDATE public.opportunity_notification_operations SET status='completed' WHERE status='active';
    INSERT INTO public.opportunity_notification_operations(id,preload_complete,expected_total) VALUES(op,false,65);
    INSERT INTO public.opportunity_notification_batches(id,operation_id,state,idempotency_key,resend_id) VALUES(historical_batch,op,'accepted','dry/'||historical_batch,'01a1fa98-5c18-78cd-b642-73421fcdce86');
    PERFORM 1 FROM public.opportunity_notification_operations WHERE id=op AND status='active' AND NOT preload_complete FOR UPDATE;
    IF NOT FOUND OR EXISTS(SELECT 1 FROM public.opportunity_notification_recipients WHERE operation_id=op)
    THEN RAISE EXCEPTION 'Fixture unavailable'; END IF;
    IF public.claim_opportunity_notification_batch(op) IS NOT NULL THEN RAISE EXCEPTION 'FAIL: preload must block'; END IF;
    INSERT INTO public.opportunity_notification_recipients(operation_id,email,batch_id,state,resend_id,accepted_at)
    SELECT op,'dryaccepted'||i||'@example.com',historical_batch,'accepted','01a1fa98-5c18-78cd-b642-73421fcdce86',now() FROM generate_series(1,15) i;
    INSERT INTO public.opportunity_notification_recipients(operation_id,email)
    SELECT op,'drypending'||lpad(i::text,2,'0')||'@example.com' FROM generate_series(1,50) i;
    UPDATE public.opportunity_notification_operations SET preload_complete=true WHERE id=op;
    b:=public.claim_opportunity_notification_batch(op);
    IF jsonb_array_length(b->'emails')<>49 THEN RAISE EXCEPTION 'FAIL: 49 BCC'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(b->'emails') e WHERE e LIKE 'dryaccepted%') THEN RAISE EXCEPTION 'FAIL: accepted excluded'; END IF;
    IF public.claim_opportunity_notification_batch(op) IS NOT NULL THEN RAISE EXCEPTION 'FAIL: outstanding claim must block'; END IF;
    PERFORM public.finish_opportunity_notification_batch((b->>'id')::uuid,'failed',NULL,'Dry 422');
    retry:=public.claim_opportunity_notification_batch(op);
    IF retry->>'id'<>b->>'id' OR retry->>'idempotency_key'<>b->>'idempotency_key' OR retry->'emails'<>b->'emails' THEN RAISE EXCEPTION 'FAIL: stable retry'; END IF;
    PERFORM public.finish_opportunity_notification_batch((b->>'id')::uuid,'accepted','dry-resend-49',NULL);
    PERFORM public.finish_opportunity_notification_batch((b->>'id')::uuid,'failed',NULL,'must not downgrade accepted');
    SELECT count(*) INTO n FROM public.opportunity_notification_recipients WHERE operation_id=op AND state='accepted';
    IF n<>64 THEN RAISE EXCEPTION 'FAIL: 64 accepted and no downgrade'; END IF;
    b:=public.claim_opportunity_notification_batch(op);
    IF jsonb_array_length(b->'emails')<>1 THEN RAISE EXCEPTION 'FAIL: last 1 BCC'; END IF;
    PERFORM public.finish_opportunity_notification_batch((b->>'id')::uuid,'indeterminate',NULL,'Dry timeout');
    IF public.claim_opportunity_notification_batch(op) IS NOT NULL THEN RAISE EXCEPTION 'FAIL: uncertain retry forbidden'; END IF;
    PERFORM public.finish_opportunity_notification_batch((b->>'id')::uuid,'accepted','dry-resend-1',NULL);
    IF public.claim_opportunity_notification_batch(op) IS NOT NULL THEN RAISE EXCEPTION 'FAIL: completed operation cannot send'; END IF;
    SELECT count(*) INTO n FROM public.opportunity_notification_recipients WHERE operation_id=op AND state='accepted';
    IF n<>65 OR NOT EXISTS(SELECT 1 FROM public.opportunity_notification_operations WHERE id=op AND status='completed') THEN RAISE EXCEPTION 'FAIL: completion'; END IF;
    RAISE EXCEPTION SQLSTATE 'ZX001' USING MESSAGE='Dry tests passed; rollback fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    RAISE NOTICE 'PASS: privileges, RLS, preload block, 49+1, accepted exclusion, outstanding claim block, stable failed retry, accepted immutable, indeterminate block, completion';
  END;
  IF EXISTS(SELECT 1 FROM public.opportunity_notification_recipients WHERE operation_id=op)
     OR EXISTS(SELECT 1 FROM public.opportunity_notification_operations WHERE id=op)
  THEN RAISE EXCEPTION 'FAIL: rollback'; END IF;
END $$;