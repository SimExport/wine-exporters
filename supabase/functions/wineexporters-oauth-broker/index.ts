import { createBroker } from "../_shared/wine-mcp-isolated/oauth-core.ts";
import { database } from "../_shared/wine-mcp-isolated/isolated-runtime.ts";
import { websiteIdentity } from "../_shared/wine-mcp-isolated/website-identity.ts";
import {publicConfig,LINKING_RELEASE_APPROVED} from '../_shared/wine-mcp-isolated/public-config.ts';
import {publicFunctionRequest} from '../_shared/wine-mcp-isolated/edge-request.ts';

const config=publicConfig(key=>Deno.env.get(key));
const enabled=LINKING_RELEASE_APPROVED&&Deno.env.get('WINE_MCP_BROKER_ENABLED')==='true';
const closed=async()=>{throw Error('Linking remains closed');};
const handler=createBroker({...config,enabled},enabled?database('broker'):closed,
 enabled?websiteIdentity(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!):closed);
Deno.serve(req => {
  const request=publicFunctionRequest(req,'wineexporters-oauth-broker',config.issuer);
  const path=new URL(request.url).pathname;
  if(req.method==='GET'&&path==='/health')return new Response(JSON.stringify({status:enabled?'enabled':'closed',version:'isolated-auth-candidate.3',enabled}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  return handler(request);
});
