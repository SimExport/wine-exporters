CREATE TABLE public.opportunity_notification_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')), historical boolean NOT NULL DEFAULT false, preload_complete boolean NOT NULL DEFAULT true, expected_total integer, created_by uuid, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunity_notification_operations TO authenticated;
GRANT ALL ON public.opportunity_notification_operations TO service_role;
ALTER TABLE public.opportunity_notification_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification operations" ON public.opportunity_notification_operations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX opportunity_notification_one_active ON public.opportunity_notification_operations(status) WHERE status='active';
CREATE TRIGGER notification_operations_updated BEFORE UPDATE ON public.opportunity_notification_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.opportunity_notification_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES public.opportunity_notification_operations(id), state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','accepted','failed','indeterminate')), idempotency_key text NOT NULL UNIQUE, resend_id text, attempted_at timestamptz, accepted_at timestamptz, error_message text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(operation_id,id)
);
GRANT SELECT ON public.opportunity_notification_batches TO authenticated;
GRANT ALL ON public.opportunity_notification_batches TO service_role;
ALTER TABLE public.opportunity_notification_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification batches" ON public.opportunity_notification_batches FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER notification_batches_updated BEFORE UPDATE ON public.opportunity_notification_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.opportunity_notification_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES public.opportunity_notification_operations(id), email text NOT NULL CHECK (email=lower(btrim(email)) AND position('@' IN email)>1), batch_id uuid, state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','accepted','failed','indeterminate')), resend_id text, accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(operation_id,email), FOREIGN KEY(operation_id,batch_id) REFERENCES public.opportunity_notification_batches(operation_id,id)
);
GRANT SELECT ON public.opportunity_notification_recipients TO authenticated;
GRANT ALL ON public.opportunity_notification_recipients TO service_role;
ALTER TABLE public.opportunity_notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification recipients" ON public.opportunity_notification_recipients FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER notification_recipients_updated BEFORE UPDATE ON public.opportunity_notification_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX notification_recipients_operation_state ON public.opportunity_notification_recipients(operation_id,state);

CREATE FUNCTION public.start_opportunity_notification(_emails text[], _admin uuid) RETURNS uuid LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE op uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('opportunity-notifications',0));
 SELECT id INTO op FROM public.opportunity_notification_operations WHERE status='active';
 IF op IS NOT NULL THEN RETURN op; END IF;
 IF NOT public.has_role(_admin,'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF cardinality(_emails)=0 OR cardinality(_emails)>50000 THEN RAISE EXCEPTION 'Invalid recipient count'; END IF;
 INSERT INTO public.opportunity_notification_operations(created_by) VALUES (_admin) RETURNING id INTO op;
 INSERT INTO public.opportunity_notification_recipients(operation_id,email) SELECT op,lower(btrim(e)) FROM unnest(_emails) e WHERE e IS NOT NULL AND btrim(e)<>'' ON CONFLICT(operation_id,email) DO NOTHING;
 UPDATE public.opportunity_notification_operations SET expected_total=(SELECT count(*) FROM public.opportunity_notification_recipients WHERE operation_id=op) WHERE id=op;
 RETURN op;
END $$;

CREATE FUNCTION public.claim_opportunity_notification_batch(_operation uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE op public.opportunity_notification_operations; b public.opportunity_notification_batches; ids uuid[]; emails text[]; total integer; accepted integer;
BEGIN
 SELECT * INTO op FROM public.opportunity_notification_operations WHERE id=_operation FOR UPDATE;
 IF op.id IS NULL OR op.status<>'active' THEN RETURN NULL; END IF;
 SELECT count(*),count(*) FILTER(WHERE state='accepted') INTO total,accepted FROM public.opportunity_notification_recipients WHERE operation_id=op.id;
 IF NOT op.preload_complete OR total<>op.expected_total THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.opportunity_notification_batches WHERE operation_id=op.id AND state='indeterminate') OR EXISTS(SELECT 1 FROM public.opportunity_notification_recipients WHERE operation_id=op.id AND state='indeterminate') THEN RETURN NULL; END IF;
 SELECT * INTO b FROM public.opportunity_notification_batches WHERE operation_id=op.id AND state IN ('pending','failed') ORDER BY created_at,id LIMIT 1 FOR UPDATE;
 IF b.id IS NOT NULL THEN
  SELECT array_agg(id ORDER BY email),array_agg(email ORDER BY email) INTO ids,emails FROM public.opportunity_notification_recipients WHERE operation_id=op.id AND batch_id=b.id;
  IF EXISTS(SELECT 1 FROM public.opportunity_notification_recipients WHERE batch_id=b.id AND state='accepted') THEN RAISE EXCEPTION 'Batch requires reconciliation'; END IF;
 ELSE
  SELECT array_agg(id ORDER BY email),array_agg(email ORDER BY email) INTO ids,emails FROM (SELECT id,email FROM public.opportunity_notification_recipients WHERE operation_id=op.id AND state='pending' AND batch_id IS NULL ORDER BY email LIMIT 49) r;
  IF ids IS NULL THEN
   IF total=accepted THEN UPDATE public.opportunity_notification_operations SET status='completed',completed_at=now() WHERE id=op.id; END IF;
   RETURN NULL;
  END IF;
  b.id:=gen_random_uuid();
  INSERT INTO public.opportunity_notification_batches(id,operation_id,idempotency_key) VALUES(b.id,op.id,'opportunities/'||op.id||'/'||b.id) RETURNING * INTO b;
 END IF;
 IF cardinality(emails) NOT BETWEEN 1 AND 49 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
 UPDATE public.opportunity_notification_batches SET state='indeterminate',attempted_at=now(),error_message=NULL WHERE id=b.id;
 UPDATE public.opportunity_notification_recipients SET batch_id=b.id,state='indeterminate' WHERE id=ANY(ids);
 RETURN jsonb_build_object('id',b.id,'operation_id',op.id,'idempotency_key',b.idempotency_key,'emails',emails);
END $$;

CREATE FUNCTION public.finish_opportunity_notification_batch(_batch uuid,_state text,_resend_id text DEFAULT NULL,_error text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE b public.opportunity_notification_batches;
BEGIN
 SELECT * INTO b FROM public.opportunity_notification_batches WHERE id=_batch;
 IF b.id IS NULL THEN RAISE EXCEPTION 'Unknown batch'; END IF;
 PERFORM 1 FROM public.opportunity_notification_operations WHERE id=b.operation_id FOR UPDATE;
 SELECT * INTO b FROM public.opportunity_notification_batches WHERE id=_batch FOR UPDATE;
 IF b.state='accepted' THEN RETURN; END IF;
 IF b.state<>'indeterminate' OR _state NOT IN ('accepted','failed','indeterminate') OR (_state='accepted' AND coalesce(_resend_id,'')='') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 UPDATE public.opportunity_notification_batches SET state=_state,resend_id=_resend_id,error_message=left(_error,1000),accepted_at=CASE WHEN _state='accepted' THEN now() ELSE NULL END WHERE id=b.id;
 UPDATE public.opportunity_notification_recipients SET state=_state,resend_id=_resend_id,accepted_at=CASE WHEN _state='accepted' THEN now() ELSE NULL END WHERE batch_id=b.id AND state<>'accepted';
 IF NOT EXISTS(SELECT 1 FROM public.opportunity_notification_recipients WHERE operation_id=b.operation_id AND state<>'accepted') THEN UPDATE public.opportunity_notification_operations SET status='completed',completed_at=now() WHERE id=b.operation_id; END IF;
END $$;

CREATE FUNCTION public.opportunity_notification_summary() RETURNS jsonb LANGUAGE sql STABLE SET search_path=public,pg_temp AS $$
 SELECT (SELECT jsonb_build_object('id',o.id,'status',o.status,'historical',o.historical,'blocked',NOT o.preload_complete OR count(r.id)<>o.expected_total,'total',coalesce(o.expected_total,count(r.id)),'accepted',count(r.id) FILTER(WHERE r.state='accepted'),'remaining',coalesce(o.expected_total,count(r.id))-count(r.id) FILTER(WHERE r.state='accepted'),'failed',count(r.id) FILTER(WHERE r.state='failed'),'indeterminate',count(r.id) FILTER(WHERE r.state='indeterminate')) FROM (SELECT * FROM public.opportunity_notification_operations ORDER BY (status='active') DESC,created_at DESC LIMIT 1) o LEFT JOIN public.opportunity_notification_recipients r ON r.operation_id=o.id GROUP BY o.id,o.status,o.historical,o.preload_complete,o.expected_total);
$$;
REVOKE ALL ON FUNCTION public.start_opportunity_notification(text[],uuid),public.claim_opportunity_notification_batch(uuid),public.finish_opportunity_notification_batch(uuid,text,text,text),public.opportunity_notification_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_opportunity_notification(text[],uuid),public.claim_opportunity_notification_batch(uuid),public.finish_opportunity_notification_batch(uuid,text,text,text),public.opportunity_notification_summary() TO service_role;
INSERT INTO public.opportunity_notification_operations(id,historical,preload_complete,expected_total,created_at) VALUES('9c5fb5ee-6794-440f-8115-2e4e22a68ec0',true,false,65,'2026-11-20 20:14:00+00');
INSERT INTO public.opportunity_notification_batches(id,operation_id,state,idempotency_key,resend_id,attempted_at,accepted_at) VALUES('ca5591a3-3d54-444d-ad7e-684f7d9ab8d1','9c5fb5ee-6794-440f-8115-2e4e22a68ec0','accepted','historical/01a1fa98-5c18-78cd-b642-73421fcdce86','01a1fa98-5c18-78cd-b642-73421fcdce86','2026-11-20 20:14:00+00','2026-11-20 20:14:00+00');