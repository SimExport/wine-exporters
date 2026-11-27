// Validation build: an environment switch alone cannot open linking to customers.
export const LINKING_RELEASE_APPROVED=false;
export function publicConfig(env:(key:string)=>string|undefined){
 const base=env('SUPABASE_URL')||'';
 const u=new URL(base);
 if(u.protocol!=='https:'||u.origin!==base)throw Error('Invalid platform URL');
 const website=env('WINE_MCP_WEBSITE_ORIGIN')||'https://wine-exporters.com';
 return {issuer:env('WINE_MCP_ISSUER')||website,website,
  endpointBase:env('WINE_MCP_BROKER_URL')||base+'/functions/v1/wineexporters-oauth-broker',
  resource:env('WINE_MCP_RESOURCE')||base+'/functions/v1/wineexporters-mcp-isolated'};
}
