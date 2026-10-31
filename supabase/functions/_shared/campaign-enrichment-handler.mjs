import {buildContext,enrich,proposedUpdate} from './campaign-enrichment-openai.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
export function createHandler({serviceClient,authorizeResults,internalJob,withResultOperation,findBuyerContact,normalizeCountry,env,enrichImpl=enrich}){
  const run=async(req)=>{
    const admin=serviceClient(),access=await authorizeResults(req,admin);
    if(!access)return json(401,{error:'Unauthorized'});
    let body;try{body=await req.json();}catch{return json(400,{error:'Invalid JSON'});}
    const id=body?.campaign_id,dryRun=body?.dry_run===true;
    if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return json(400,{error:'Invalid campaign_id'});
    if(!dryRun&&access==='internal'&&!await internalJob(req,admin,id,'enrich'))return json(409,{error:'Invalid result job lease'});
    const test=await admin.rpc('is_test_campaign',{_id:id});
    if(test.error)return json(500,{error:'Campaign classification unavailable'});
    if(test.data===true)return json(200,{skipped:true,reason:'test_campaign'});
    const fetched=await admin.from('campaigns').select('id,name,user_id,status,target_markets,markets,selected_wines,cuvees,segments,volume_band,price_min,price_max,subject_selected,message_text,client_note').eq('id',id).maybeSingle();
    if(fetched.error||!fetched.data)return json(404,{error:'Campaign not found'});
    const campaign=fetched.data;
    if(!dryRun&&['results','archived'].includes(campaign.status))return json(200,{skipped:true,reason:'published_results_protected'});
    const profile=await admin.from('profiles').select('domain_name,aoc,location,bottles_per_year,certifications,organic_conversion,current_markets,priority_markets,avoid_markets,target_buyer_description,strengths,description').eq('user_id',campaign.user_id).maybeSingle();
    const wineResult=await admin.from('wines').select('id,name,appellation,color,grapes,exw_price_eur,vintages,organic,is_biodynamic,is_natural,awards,is_active,description').eq('user_id',campaign.user_id);
    if(profile.error||!profile.data||wineResult.error)return json(500,{error:'Producer context unavailable'});
    const contacts=await admin.from('campaign_interested_contacts').select('id,campaign_id,company_name,contact_name,email,country,phone,score,description,recommended_actions,origin,message').eq('campaign_id',id).order('id',{ascending:true});
    if(contacts.error)return json(500,{error:'Contacts unavailable'});
    const force=access==='admin'&&body.force===true;
    const limit=access==='internal'&&!dryRun?1:Number.isFinite(Number(body.limit))?Math.min(20,Math.max(1,Math.round(Number(body.limit)))):5;
    const excluded=new Set(access==='internal'&&!dryRun?[]:Array.isArray(body.exclude_ids)?body.exclude_ids:[]);
    const ids=dryRun&&Array.isArray(body.contact_ids)?new Set(body.contact_ids):null;
    const all=(contacts.data||[]),candidates=all.filter(r=>dryRun||force||!String(r.description||'').trim());
    const todo=candidates.filter(r=>!excluded.has(r.id)&&(!ids||ids.has(r.id))),batch=todo.slice(0,limit);
    const previews=[],failed=[],processedIds=[];let enriched=0,providerStatus=500,stoppedEarly=false;
    const start=Date.now();
    for(let i=0;i<batch.length;i+=3){
      if(Date.now()-start>45000){stoppedEarly=true;break;}
      await Promise.all(batch.slice(i,i+3).map(async row=>{
        try{
          const matched=row.email?await findBuyerContact(admin,row.email,row.company_name||null):null;
          const context=buildContext(campaign,profile.data,wineResult.data||[],row,matched);
          const result=await enrichImpl(context,{apiKey:env('OPENAI_API_KEY')});
          const update=proposedUpdate(row,result.value,normalizeCountry,matched);
          if(dryRun){previews.push({id:row.id,proposed_update:update,usage:result.usage});return;}
          // Re-check publication and the worker lease after the external request.
          const current=await admin.from('campaigns').select('status').eq('id',id).maybeSingle();
          if(current.error||!current.data||['results','archived'].includes(current.data.status))throw new Error('Campaign publication changed');
          if(access==='internal'&&!await internalJob(req,admin,id,'enrich'))throw new Error('Result job lease expired');
          let query=admin.from('campaign_interested_contacts').update(update).eq('id',row.id).eq('campaign_id',id);
          // Prevent replacing a concurrently enriched record except an explicit admin force.
          if(!force)query=row.description===null?query.is('description',null):query.eq('description',row.description);
          const saved=await query.select('id');
          if(saved.error)throw new Error('Enrichment persistence failed');
          enriched+=(saved.data||[]).length;
        }catch(e){
          const status=String(e?.message||'').match(/^OpenAI (\d{3}):/);
          if(status)providerStatus=Number(status[1]);
          failed.push(row.id); // Do not log provider bodies, credentials or contact details.
        }finally{processedIds.push(row.id);}
      }));
    }
    return json(failed.length?providerStatus:200,{ok:failed.length===0,total:all.length,candidates:candidates.length,enriched,failed:failed.length,processed:processedIds.length,processed_ids:processedIds,remaining:Math.max(0,todo.length-processedIds.length),next_offset:Number(body.offset)||0,stopped_early:stoppedEarly,...(dryRun?{dry_run:true,write_count:0,previews}:{})});
  };
  return async req=>{
    if(req.method==='OPTIONS')return json(200,{});
    if(req.method!=='POST')return json(405,{error:'Method not allowed'});
    let body;try{body=await req.clone().json();}catch{return json(400,{error:'Invalid JSON'});}
    try{
      // Previews authenticate inside run and do not acquire mutation locks.
      return body?.dry_run===true?await run(req):await withResultOperation(req,run);
    }catch{return json(500,{error:'Enrichment failed'});}
  };
}
