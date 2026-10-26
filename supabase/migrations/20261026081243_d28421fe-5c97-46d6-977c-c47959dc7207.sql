CREATE OR REPLACE FUNCTION public.search_buyer_contacts(_countries text[], _q text, _offset integer, _limit integer)
RETURNS TABLE(row_data jsonb, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF public.is_exportvins_trial_user(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN QUERY
 WITH f AS (
 SELECT b.*, richness.is_enriched, richness.completeness_level
 FROM public.buyer_contacts b
 CROSS JOIN LATERAL (
   SELECT count(*) > 0 AS is_enriched,
     coalesce(max(CASE
       WHEN e.confidence='high' AND categories.sourced AND categories.present_count>=4 THEN 3
       WHEN e.confidence IN ('high','medium') AND categories.sourced AND categories.present_count>=2 THEN 2
       ELSE 1 END),0) AS completeness_level
   FROM public.buyer_contact_enrichments e
   CROSS JOIN LATERAL (
     SELECT
       EXISTS (SELECT 1 FROM unnest(e.source_urls) s(url) WHERE s.url ~ '^https?://[^/@[:space:]]+([/?#]|$)') AS sourced,
       (coalesce(nullif(trim(e.description_fr),''),nullif(trim(e.description_en),'')) IS NOT NULL)::int
       + EXISTS (SELECT 1 FROM unnest(e.wine_origins || e.wine_regions || e.wine_appellations) v(value) WHERE length(trim(v.value))>0)::int
       + EXISTS (SELECT 1 FROM unnest(e.wine_styles || e.wine_specialties) v(value) WHERE length(trim(v.value))>0)::int
       + EXISTS (SELECT 1 FROM unnest(e.distribution_channels) v(value) WHERE length(trim(v.value))>0)::int
       + EXISTS (SELECT 1 FROM unnest(e.featured_producers) v(value) WHERE length(trim(v.value))>0)::int
       + EXISTS (SELECT 1 FROM public.buyer_contact_enrichment_people person
         WHERE person.buyer_contact_id=b.id AND length(trim(person.full_name))>0
           AND length(trim(person.job_title))>0
           AND person.source_url ~ '^https?://[^/@[:space:]]+([/?#]|$)')::int AS present_count
   ) categories
   WHERE e.buyer_contact_id=b.id
 ) richness
 WHERE b.country=ANY(_countries) AND (
 coalesce(trim(_q),'')='' OR extensions.unaccent(lower(coalesce(b.company_name,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
 OR extensions.unaccent(lower(coalesce(b.city,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
 OR extensions.unaccent(lower(coalesce(b.email,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%'
 OR extensions.unaccent(lower(coalesce(b.full_address,''))) LIKE '%' || extensions.unaccent(lower(trim(_q))) || '%')),
 paged AS (
 SELECT to_jsonb(f.*) - 'completeness_level' AS payload, f.id, f.company_name, f.completeness_level,
 count(*) OVER () AS total FROM f
 ORDER BY f.completeness_level DESC, f.company_name ASC NULLS LAST, f.id ASC
 OFFSET greatest(_offset,0) LIMIT least(greatest(_limit,1),100))
 SELECT p.payload || jsonb_build_object('profile_highlights', coalesce((
 SELECT jsonb_agg(labels.label ORDER BY labels.first_position) FROM (
 SELECT trim(v.label) AS label, min(v.position) AS first_position
 FROM public.buyer_contact_enrichments e,
 LATERAL unnest(e.wine_specialties || e.wine_origins || e.distribution_channels) WITH ORDINALITY AS v(label,position)
 WHERE e.buyer_contact_id=p.id AND e.status IN ('enriched','review_needed','partial','verified','validated') AND e.confidence='high'
 AND EXISTS (SELECT 1 FROM unnest(e.source_urls) AS s(url) WHERE s.url ~ '^https?://[^/@[:space:]]+([/?#]|$)')
 AND length(trim(v.label))>0 GROUP BY trim(v.label) ORDER BY min(v.position) LIMIT 3
 ) labels), '[]'::jsonb)), p.total FROM paged p
 ORDER BY p.completeness_level DESC, p.company_name ASC NULLS LAST, p.id ASC;
END; $function$;

-- Transaction-only tests: no persistent test fixtures, contacts or quota writes.
DO $tests$
DECLARE actual int[]; n int;
BEGIN
 WITH fixtures(id,name,confidence,sourced,description,origins,styles,channels,producers) AS (
 VALUES (1,'Zulu','high',true,'Description',ARRAY['France'],ARRAY['Red'],ARRAY['Retail'],ARRAY[]::text[]),
 (2,'Alpha','high',true,'Description',ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[]),
 (3,'Tie','medium',true,'Description',ARRAY['France'],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[]),
 (4,'Tie','medium',true,'Description',ARRAY['France'],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[]),
 (5,'Empty','high',true,'  ',ARRAY[NULL,'',' '],NULL::text[],ARRAY[' '],NULL::text[]),
 (6,'None',NULL::text,false,NULL::text,NULL::text[],NULL::text[],NULL::text[],NULL::text[])),
 people(contact_id,name,job,source) AS (VALUES (1,'Person A','Owner','https://example.com/a'),(1,'Person B','Director','https://example.com/b'),(5,' ','Director','https://example.com'),(5,'Person C',' ', 'https://example.com')),
 counts AS (SELECT f.*, (nullif(trim(description),'') IS NOT NULL)::int
 + EXISTS(SELECT 1 FROM unnest(origins) v WHERE length(trim(v))>0)::int
 + EXISTS(SELECT 1 FROM unnest(styles) v WHERE length(trim(v))>0)::int
 + EXISTS(SELECT 1 FROM unnest(channels) v WHERE length(trim(v))>0)::int
 + EXISTS(SELECT 1 FROM unnest(producers) v WHERE length(trim(v))>0)::int
 + EXISTS(SELECT 1 FROM people p WHERE p.contact_id=f.id AND length(trim(p.name))>0 AND length(trim(p.job))>0 AND p.source ~ '^https?://[^/@[:space:]]+([/?#]|$)')::int AS categories FROM fixtures f),
 ranked AS (SELECT *,CASE WHEN confidence='high' AND sourced AND categories>=4 THEN 3 WHEN confidence IN ('high','medium') AND sourced AND categories>=2 THEN 2 WHEN confidence IS NOT NULL THEN 1 ELSE 0 END AS level FROM counts)
 SELECT array_agg(id ORDER BY level DESC,name ASC NULLS LAST,id ASC),count(*) INTO actual,n FROM ranked;
 IF actual<>ARRAY[1,3,4,2,5,6] OR n<>6 THEN RAISE EXCEPTION 'Completeness fixture ordering / cardinality failed'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ARRAY[NULL,'',' ']) v WHERE length(trim(v))>0) THEN RAISE EXCEPTION 'Empty category failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
END $tests$;
SET LOCAL ROLE authenticated;
DO $reads$
DECLARE countries text[]; expected bigint; found_total bigint; page1 jsonb; page2 jsonb; repeated jsonb; rows_count int;
BEGIN
 IF public.has_role(auth.uid(),'admin') OR public.is_exportvins_trial_user(auth.uid()) THEN RAISE EXCEPTION 'Test identity must be non-admin/non-trial'; END IF;
 FOREACH countries SLICE 1 IN ARRAY ARRAY[['Germany','Allemagne'],['United States','USA']] LOOP
   SELECT count(*) INTO expected FROM public.buyer_contacts WHERE country=ANY(countries);
   IF expected<20 THEN RAISE EXCEPTION 'Market fixture needs two full pages'; END IF;
   SELECT jsonb_agg(row_data),min(total_count),count(*) INTO page1,found_total,rows_count FROM public.search_buyer_contacts(countries,'',0,10);
   IF found_total<>expected OR rows_count<>10 THEN RAISE EXCEPTION 'First page/count mismatch'; END IF;
   SELECT jsonb_agg(row_data),min(total_count),count(*) INTO page2,found_total,rows_count FROM public.search_buyer_contacts(countries,'',10,10);
   IF found_total<>expected OR rows_count<>10 THEN RAISE EXCEPTION 'Second page/count mismatch'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(page1) a JOIN jsonb_array_elements(page2) b ON a->>'id'=b->>'id') THEN RAISE EXCEPTION 'Duplicate across pages'; END IF;
   SELECT jsonb_agg(row_data) INTO repeated FROM public.search_buyer_contacts(countries,'',0,10);
   IF repeated IS DISTINCT FROM page1 THEN RAISE EXCEPTION 'Unstable order'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(page1 || page2) r WHERE NOT(r ? 'profile_highlights') OR NOT(r ? 'is_enriched') OR r ? 'completeness_level' OR jsonb_typeof(r->'profile_highlights')<>'array') THEN RAISE EXCEPTION 'Payload allowlist regression'; END IF;
 END LOOP;
END $reads$;
RESET ROLE;
-- Use an existing trial identity only within this transaction, never change its entitlement.
DO $trial_setup$
DECLARE trial_id uuid;
BEGIN
 SELECT user_id INTO trial_id FROM public.user_entitlements WHERE public.is_exportvins_trial_user(user_id) LIMIT 1;
 IF trial_id IS NULL THEN RAISE EXCEPTION 'No existing trial identity available for required refusal test'; END IF;
 PERFORM set_config('request.jwt.claim.sub',trial_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',trial_id,'role','authenticated')::text,true);
END $trial_setup$;
SET LOCAL ROLE authenticated;
DO $trial$
BEGIN
 BEGIN
 PERFORM * FROM public.search_buyer_contacts(ARRAY['Germany'],'',0,10);
 RAISE EXCEPTION 'Trial was allowed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF;
 END;
END $trial$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
 BEGIN
 PERFORM * FROM public.search_buyer_contacts(ARRAY['Germany'],'',0,10);
 RAISE EXCEPTION 'Anonymous execution was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $anon$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);