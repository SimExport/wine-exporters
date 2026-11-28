-- Add isolated rotating refresh tokens. No website auth or data policies are modified.
do $$ begin
 if not exists(select 1 from wine_mcp_private.settings where singleton and not enabled and test_only) then raise exception 'MCP must be closed during migration'; end if;
end $$;
create table if not exists wine_mcp_private.refresh_tokens(
 token_hash text primary key check(token_hash ~ '^[A-Za-z0-9_-]{43}$'),
 grant_id uuid not null references wine_mcp_private.grants(id) on delete cascade,
 expires_at timestamptz not null,
 used_at timestamptz
);
alter table wine_mcp_private.refresh_tokens enable row level security;
revoke all on wine_mcp_private.refresh_tokens from public, anon, authenticated;
create index if not exists refresh_tokens_grant_idx on wine_mcp_private.refresh_tokens(grant_id);
CREATE OR REPLACE FUNCTION wine_mcp_private.broker(op text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 c wine_mcp_private.clients; q wine_mcp_private.pending; a wine_mcp_private.codes;
 g wine_mcp_private.grants; t wine_mcp_private.tokens; cfg wine_mcp_private.settings;
 uid uuid; sid uuid; gid uuid; requested text[]; result jsonb;
 rt wine_mcp_private.refresh_tokens; refresh_expiry timestamptz;
begin
 select * into cfg from wine_mcp_private.settings where singleton and enabled;
 if not found then raise exception 'disabled'; end if;
 if op='pending' then
  select * into c from wine_mcp_private.clients where id=p->>'client_id' and enabled;
  select array_agg(v) into requested from jsonb_array_elements_text(p->'scopes') v;
  if c.id is null or not (p->>'redirect_uri'=any(c.redirect_uris)) or p->>'resource'<>cfg.resource
    or requested is null or not (requested<@c.scopes) or cardinality(requested)=0
    or exists(select 1 from unnest(requested) s where s not in ('wineexporters:account','wineexporters:importers','wineexporters:crm:read','wineexporters:crm:write'))
    or p->>'challenge' !~ '^[A-Za-z0-9_-]{43}$' or length(p->>'state') not between 1 and 1024
    or p->>'request_hash' !~ '^[A-Za-z0-9_-]{43}$' or p->>'binding_hash' !~ '^[A-Za-z0-9_-]{43}$'
  then return null; end if;
  -- Only exact pre-registered HTTPS redirects; no wildcard, fragment or embedded credentials.
  if p->>'redirect_uri' !~ '^https://[^/@#[:space:]]+(/[^#[:space:]]*)?$' then return null; end if;
  insert into wine_mcp_private.pending(request_hash,binding_hash,client_id,redirect_uri,resource,state,challenge,scopes)
  values(p->>'request_hash',p->>'binding_hash',c.id,p->>'redirect_uri',cfg.resource,p->>'state',p->>'challenge',requested);
  return '{"ok":true}';
 elsif op='details' or op='decision' then
  select * into q from wine_mcp_private.pending where request_hash=p->>'request_hash' and expires_at>clock_timestamp() for update;
  if not found then return null; end if;
  select * into c from wine_mcp_private.clients where id=q.client_id and enabled and q.redirect_uri=any(redirect_uris) and q.scopes<@scopes;
  if c.id is null or q.resource<>cfg.resource then return null; end if;
  if op='details' then return jsonb_build_object('client_name',c.name,'scopes',q.scopes,'resource',q.resource); end if;
  if q.binding_hash is distinct from p->>'binding_hash' then return null; end if;
  if (p->>'approve')::boolean then
   uid:=(p->>'user_id')::uuid; sid:=(p->>'session_id')::uuid;
   if not wine_mcp_private.actor(uid,sid) or not wine_mcp_private.eligible(uid)
    or not wine_mcp_private.test_scopes_allowed(uid,q.scopes) then return null; end if;
   insert into wine_mcp_private.grants(user_id,session_id,client_id,resource,scopes)
   values(uid,sid,q.client_id,q.resource,q.scopes) returning id into gid;
   insert into wine_mcp_private.codes(code_hash,grant_id,redirect_uri,challenge)
   values(p->>'code_hash',gid,q.redirect_uri,q.challenge);
  end if;
  delete from wine_mcp_private.pending where request_hash=q.request_hash;
  return jsonb_build_object('redirect_uri',q.redirect_uri,'state',q.state);
 elsif op='exchange' then
  select * into a from wine_mcp_private.codes where code_hash=p->>'code_hash' for update;
  if not found then return null; end if;
  select * into g from wine_mcp_private.grants where id=a.grant_id for update;
  select * into c from wine_mcp_private.clients where id=g.client_id and enabled;
  if c.id is null or g.client_id is distinct from p->>'client_id' or g.resource is distinct from p->>'resource'
    or g.resource<>cfg.resource or g.revoked_at is not null or not (g.scopes<@c.scopes)
    or a.redirect_uri is distinct from p->>'redirect_uri' or not(a.redirect_uri=any(c.redirect_uris))
    or a.challenge is distinct from p->>'challenge' or a.expires_at<=clock_timestamp()
    or not wine_mcp_private.actor(g.user_id,g.session_id) or not wine_mcp_private.eligible(g.user_id)
    or not wine_mcp_private.test_scopes_allowed(g.user_id,g.scopes) then return null; end if;
  if a.used_at is not null then
   -- Valid PKCE replay revokes the already-issued token family. Commit this result, do not raise.
   update wine_mcp_private.grants set revoked_at=clock_timestamp() where id=g.id;
   return null;
  end if;
  if coalesce(p->>'token_hash','') !~ '^[A-Za-z0-9_-]{43}$' or coalesce(p->>'new_refresh_hash','') !~ '^[A-Za-z0-9_-]{43}$' or p->>'token_hash'=p->>'new_refresh_hash' then return null; end if;
  update wine_mcp_private.codes set used_at=clock_timestamp() where code_hash=a.code_hash;
  insert into wine_mcp_private.tokens(token_hash,grant_id) values(p->>'token_hash',g.id);
  insert into wine_mcp_private.refresh_tokens(token_hash,grant_id,expires_at) values(p->>'new_refresh_hash',g.id,least(clock_timestamp()+interval '7 days',g.created_at+interval '30 days'));
  return jsonb_build_object('scopes',g.scopes);
 elsif op='refresh' then
  if coalesce(p->>'refresh_hash','') !~ '^[A-Za-z0-9_-]{43}$' or coalesce(p->>'token_hash','') !~ '^[A-Za-z0-9_-]{43}$' or coalesce(p->>'new_refresh_hash','') !~ '^[A-Za-z0-9_-]{43}$' or p->>'token_hash'=p->>'new_refresh_hash' or p->>'refresh_hash'=p->>'new_refresh_hash' then return null; end if;
  select grant_id into gid from wine_mcp_private.refresh_tokens where token_hash=p->>'refresh_hash';
  if not found then return null; end if;
  select * into g from wine_mcp_private.grants where id=gid for update;
  select * into rt from wine_mcp_private.refresh_tokens where token_hash=p->>'refresh_hash' and grant_id=gid for update;
  select * into c from wine_mcp_private.clients where id=g.client_id and enabled;
  if c.id is null or g.client_id is distinct from p->>'client_id' or g.resource is distinct from p->>'resource'
   or g.resource<>cfg.resource or g.revoked_at is not null or not(g.scopes<@c.scopes)
   or not wine_mcp_private.actor(g.user_id,g.session_id) or not wine_mcp_private.eligible(g.user_id)
   or not wine_mcp_private.test_scopes_allowed(g.user_id,g.scopes) then return null; end if;
  if rt.used_at is not null then
   update wine_mcp_private.grants set revoked_at=clock_timestamp() where id=g.id;
   return null;
  end if;
  refresh_expiry:=least(clock_timestamp()+interval '7 days',g.created_at+interval '30 days');
  if rt.expires_at<=clock_timestamp() or refresh_expiry<=clock_timestamp() then return null; end if;
  update wine_mcp_private.refresh_tokens set used_at=clock_timestamp() where token_hash=rt.token_hash;
  insert into wine_mcp_private.tokens(token_hash,grant_id) values(p->>'token_hash',g.id);
  insert into wine_mcp_private.refresh_tokens(token_hash,grant_id,expires_at) values(p->>'new_refresh_hash',g.id,refresh_expiry);
  return jsonb_build_object('scopes',g.scopes);
 elsif op='revoke' then
  select g0.* into g from wine_mcp_private.grants g0
  where g0.client_id=p->>'client_id' and (exists(select 1 from wine_mcp_private.tokens t0 where t0.grant_id=g0.id and t0.token_hash=p->>'token_hash') or exists(select 1 from wine_mcp_private.refresh_tokens rt0 where rt0.grant_id=g0.id and rt0.token_hash=p->>'token_hash')) for update of g0;
  if found then update wine_mcp_private.grants set revoked_at=clock_timestamp() where id=g.id; end if;
  return '{}';
 elsif op in ('connections','disconnect') then
  uid:=(p->>'user_id')::uuid; sid:=(p->>'session_id')::uuid;
  if not wine_mcp_private.actor(uid,sid) then raise exception 'invalid session'; end if;
  if op='disconnect' then
   update wine_mcp_private.grants set revoked_at=clock_timestamp() where id=(p->>'grant_id')::uuid and user_id=uid and revoked_at is null;
   return '{}';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('grant_id',g0.id,'client_name',c0.name,'scopes',g0.scopes,'created_at',g0.created_at)), '[]') into result
  from wine_mcp_private.grants g0 join wine_mcp_private.clients c0 on c0.id=g0.client_id
  where g0.user_id=uid and g0.revoked_at is null and (exists(select 1 from wine_mcp_private.tokens t0 where t0.grant_id=g0.id and t0.expires_at>clock_timestamp()) or exists(select 1 from wine_mcp_private.refresh_tokens r0 where r0.grant_id=g0.id and r0.used_at is null and r0.expires_at>clock_timestamp()));
  return result;
 end if;
 raise exception 'unsupported operation';
end;
$function$
;
