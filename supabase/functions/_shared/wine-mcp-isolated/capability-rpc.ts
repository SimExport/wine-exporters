export type Capability = 'broker'|'resource';
// The service key is a privileged server credential. It is not an MCP access token.
// This adapter invokes only two fixed RPC paths, never arbitrary tables or RPC names.
export function capabilityRpc(kind: Capability,base: string,key: string,request: typeof fetch=fetch){
 const u=new URL(base);
 if(u.protocol!=='https:'||u.origin!==base||!key)throw Error('Invalid server capability configuration');
 const endpoint=base+'/rest/v1/rpc/wineexporters_mcp_'+kind+'_capability';
 return async(op:string,data:Record<string,unknown>)=>{
  const res=await request(endpoint,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({_operation:op,_request:data}),signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!res.ok){await res.body?.cancel();throw Error('Server capability unavailable');}
  return await res.json();
 };
}
