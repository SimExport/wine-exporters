import { createBroker, hash, SCOPES, TOKEN_TTL } from "./oauth-core.ts";
import { activeSubscription } from "./subscription.ts";
import { publicConfig, LINKING_RELEASE_APPROVED } from "./public-config.ts";
const assert=(x: unknown, message="assertion failed")=>{if(!x)throw Error(message)};
const website="https://wine-exporters.com";
const resource="https://mcp.example.invalid/mcp";
const client="pilot";
const redirect="https://chatgpt.com/connector_platform_oauth_redirect";
const verifier="v".repeat(43);
const state="pilot-state";
const config={issuer:website,website,resource,enabled:true,endpointBase:"https://broker.example.invalid/oauth"};
function form(path:string, fields:Record<string,string>, extra:Record<string,string>={}){
 return new Request(website+path,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",...extra},body:new URLSearchParams(fields)});
}
Deno.test("OAuth broker: actual HTTP handlers, PKCE, binding, code exchange, denial and revocation",async()=>{
 let pending:any=null, grant:any=null, revoked=false, used=false;
 let refreshHash="", previousRefreshHash="";
 const mockStore=async(op:string,d:Record<string,unknown>)=>{
  if(op==="pending"){
   if(d.client_id!==client||d.redirect_uri!==redirect||d.resource!==resource)return null;
   pending=d;return {ok:true};
  }
  if(op==="details")return pending&&d.request_hash===pending.request_hash?{client_name:"Pilot",resource,scopes:pending.scopes}:null;
  if(op==="decision"){
   if(!pending||d.request_hash!==pending.request_hash||d.binding_hash!==pending.binding_hash)return null;
   const result={redirect_uri:redirect,state:pending.state};
   if(d.approve)grant={...d,...pending};
   pending=null;return result;
  }
  if(op==="exchange"){
   if(!grant||d.code_hash!==grant.code_hash||d.challenge!==grant.challenge||d.client_id!==client||d.redirect_uri!==redirect||d.resource!==resource||revoked||used)return null;
   used=true;refreshHash=String(d.new_refresh_hash);return {scopes:grant.scopes};
  }
  if(op==="refresh"){
   if(!grant||d.client_id!==client||d.resource!==resource||revoked)return null;
   if(d.refresh_hash===previousRefreshHash){revoked=true;return null;}
   if(d.refresh_hash!==refreshHash)return null;
   previousRefreshHash=refreshHash;refreshHash=String(d.new_refresh_hash);return {scopes:grant.scopes};
  }
  if(op==="revoke"){revoked=true;return {};}
  throw Error("unexpected operation");
 };
 const broker=createBroker(config,mockStore,async(jwt)=>{assert(jwt==="test-site-token");return {user_id:"test-user",session_id:"test-session"}});
 const discovery=await broker(new Request(website+"/.well-known/oauth-authorization-server"));
 const m=await discovery.json();assert(discovery.status===200&&m.issuer===website&&m.code_challenge_methods_supported.includes("S256"));
 const params=new URLSearchParams({response_type:"code",client_id:client,redirect_uri:redirect,resource,state,scope:SCOPES.join(" "),code_challenge:await hash(verifier),code_challenge_method:"S256"});
 const open=()=>broker(new Request(website+"/authorize?"+params));
 const initial=await open();assert(initial.status===303);
 const location=new URL(initial.headers.get("Location")!);const request=new URLSearchParams(location.hash.slice(1)).get("request")!;
 assert(location.origin===website&&location.pathname==="/mcp/consent"&&request.length===43);
 const cookie=initial.headers.get("Set-Cookie")!.split(";")[0];
 assert(initial.headers.get("Set-Cookie")!.includes("HttpOnly")&&initial.headers.get("Set-Cookie")!.includes("Secure"));
 const details=await broker(form("/details",{request},{Origin:website}));assert(details.status===200&&(await details.json()).client_name==="Pilot");
 const missing=await broker(form("/decision",{request,approve:"yes",access_token:"test-site-token"},{Origin:website}));assert(missing.status===403);
 const wrongOrigin=await broker(form("/decision",{request,approve:"yes",access_token:"test-site-token"},{Origin:"https://evil.example.invalid",Cookie:cookie}));assert(wrongOrigin.status===403);
 const approval=await broker(form("/decision",{request,approve:"yes",access_token:"test-site-token"},{Origin:website,Cookie:cookie}));assert(approval.status===303);
 const callback=new URL(approval.headers.get("Location")!);assert(callback.origin==="https://chatgpt.com"&&callback.searchParams.get("state")===state&&callback.searchParams.get("iss")===website);
 const exchange={grant_type:"authorization_code",client_id:client,code:callback.searchParams.get("code")!,redirect_uri:redirect,resource,code_verifier:verifier};
 const bad=await broker(form("/token",{...exchange,code_verifier:"x".repeat(43)}));assert(bad.status===400);
 const result=await broker(form("/token",exchange));assert(result.status===200);const token=await result.json();
 assert(/^wemcp_[A-Za-z0-9_-]{43}$/.test(token.access_token)&&token.expires_in===TOKEN_TTL&&/^wermcp_[A-Za-z0-9_-]{43}$/.test(token.refresh_token)&&!token.access_token.includes("."));
 const refreshRequest={grant_type:"refresh_token",client_id:client,refresh_token:token.refresh_token};
 const wrong=await broker(form("/token",{...refreshRequest,resource:"https://wrong.example.invalid"}));assert(wrong.status===400);
 const refreshed=await broker(form("/token",refreshRequest));assert(refreshed.status===200);const pair=await refreshed.json();
 assert(pair.access_token!==token.access_token&&pair.refresh_token!==token.refresh_token&&/^wermcp_[A-Za-z0-9_-]{43}$/.test(pair.refresh_token));
 assert((await broker(form("/token",refreshRequest))).status===400&&revoked);
 assert((await broker(form("/token",{...refreshRequest,refresh_token:pair.refresh_token}))).status===400);
 assert((await broker(form("/token",exchange))).status===400);
 assert((await broker(form("/revoke",{client_id:client,token:token.access_token}))).status===200&&revoked);
 const again=await open();const id=new URLSearchParams(new URL(again.headers.get("Location")!).hash.slice(1)).get("request")!;
 const denied=await broker(form("/decision",{request:id,approve:"no"},{Origin:website,Cookie:again.headers.get("Set-Cookie")!.split(";")[0]}));
 const deniedCallback=new URL(denied.headers.get("Location")!);assert(deniedCallback.searchParams.get("error")==="access_denied"&&deniedCallback.searchParams.get("iss")===website);
});
Deno.test("Disabled release is fail-closed; fixed public issuer",async()=>{
 assert(LINKING_RELEASE_APPROVED===false);
 const c=publicConfig((k)=>k==="SUPABASE_URL"?"https://project.supabase.co":undefined);
 assert(c.issuer===website&&c.resource.endsWith("/wineexporters-mcp-isolated"));
 const broker=createBroker({...config,enabled:false},async()=>{throw Error("unexpected store call")},async()=>{throw Error("unexpected identity")});
 assert((await broker(new Request(website+"/authorize"))).status===503);
});
Deno.test("Stripe eligibility: four real plan IDs, inactive, paused, mismatched, ambiguous and missing",async()=>{
 const ids=["prod_Tz5poZVS69KDTi","prod_UGecQn333xCJ73","prod_TgeYMnIDcHFp54","prod_TnlDl1u25NcthG"];
 const account={email:"pilot@example.invalid",stripe_customer_id:"cus_TEST"};
 const mock=(product:string,status="active",pause=false,mismatch=false,duplicate=false)=>async(input:RequestInfo|URL)=>{
  const url=new URL(String(input));
  if(url.pathname.endsWith("/customers"))return Response.json({data:Array.from({length:duplicate?2:1},()=>({id:"cus_TEST",email:account.email})),has_more:false});
  if(url.pathname.endsWith("/customers/cus_TEST"))return Response.json({id:"cus_TEST",email:mismatch?"other@example.invalid":account.email});
  if(url.pathname.endsWith("/subscriptions"))return Response.json({has_more:false,data:[{customer:"cus_TEST",status,pause_collection:pause?{}:null,items:{data:[{price:{product}}],has_more:false}}]});
  throw Error("Unexpected Stripe URL");
 };
 for(const id of ids)assert(await activeSubscription(account,"fake-key",mock(id) as typeof fetch));
 assert(!await activeSubscription(account,"fake-key",mock("prod_unrelated") as typeof fetch));
 assert(!await activeSubscription(account,"fake-key",mock(ids[0],"past_due") as typeof fetch));
 assert(!await activeSubscription(account,"fake-key",mock(ids[0],"active",true) as typeof fetch));
 assert(!await activeSubscription(account,"fake-key",mock(ids[0],"active",false,true) as typeof fetch));
 assert(await activeSubscription({...account,stripe_customer_id:null},"fake-key",mock(ids[0]) as typeof fetch));
 assert(!await activeSubscription({...account,stripe_customer_id:null},"fake-key",mock(ids[0],"active",false,false,true) as typeof fetch));
 assert(!await activeSubscription(account,"",mock(ids[0]) as typeof fetch));
});
