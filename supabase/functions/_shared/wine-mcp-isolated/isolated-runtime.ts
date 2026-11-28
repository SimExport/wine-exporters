import postgres from "npm:postgres@3.4.7";
import {capabilityRpc} from './capability-rpc.ts';

export function database(kind: "broker" | "resource") {
  const mode=Deno.env.get('WINE_MCP_DATABASE_MODE')||'isolated_roles';
  if(mode==='capability_rpc')return capabilityRpc(kind,Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');
  if(mode!=='isolated_roles')throw Error('Unsupported database mode');
  const key = kind === "broker" ? "WINE_MCP_BROKER_DATABASE_URL" : "WINE_MCP_RESOURCE_DATABASE_URL";
  const url = Deno.env.get(key);
  if (!url) throw Error("Missing isolated runtime configuration");
  const sql = postgres(url, { ssl: "verify-full", max: 2, prepare: false, idle_timeout: 20, connect_timeout: 8,
    connection: { statement_timeout: 8000, lock_timeout: 3000 }, debug: false });
  const expected = kind === "broker" ? "wine_mcp_broker" : "wine_mcp_resource";
  let checked = false;
  return async (op: string, data: Record<string, unknown>) => {
    if (!checked) {
      const [role] = await sql`select current_user as name, r.rolsuper, r.rolbypassrls, r.rolinherit,
        has_schema_privilege(current_user,'public','usage') website_schema,
        has_schema_privilege(current_user,'auth','usage') auth_schema,
        exists(select 1 from pg_auth_members m where m.member=r.oid) memberships,
        exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where p.prosecdef and n.nspname not in ('pg_catalog','information_schema')
          and has_schema_privilege(r.oid,n.oid,'usage') and has_function_privilege(r.oid,p.oid,'execute')
          and not(n.nspname='wine_mcp_private' and p.proname=${kind})) unexpected_capability
        from pg_roles r where r.rolname=current_user`;
      if (role?.name !== expected || role.rolsuper || role.rolbypassrls || role.rolinherit
        || role.website_schema || role.auth_schema || role.memberships || role.unexpected_capability)
        throw Error("Refusing database credential outside the isolated capability boundary");
      checked = true;
    }
    const rows = kind === "broker"
      ? await sql`select wine_mcp_private.broker(${op}, ${sql.json(data as postgres.JSONValue)}) as result`
      : await sql`select wine_mcp_private.resource(${op}, ${sql.json(data as postgres.JSONValue)}) as result`;
    return rows[0]?.result;
  };
}

