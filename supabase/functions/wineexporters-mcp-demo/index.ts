import { McpServer } from "npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js";
import { z } from "npm:zod@4.1.13";

// Public demo only. No database client, secrets, real contacts or production access.
const data = [
 {id:"demo-dk-01",company_name:"Importateur Démo Nord 01",country:"Denmark",city:"Copenhagen",focus:"Independent French wines",channel:"Wine shops and restaurants"},
 {id:"demo-dk-02",company_name:"Importateur Démo Nord 02",country:"Denmark",city:"Aarhus",focus:"Organic European wines",channel:"Specialist retail"},
 {id:"demo-dk-03",company_name:"Importateur Démo Nord 03",country:"Denmark",city:"Odense",focus:"Small family wineries",channel:"Restaurants"},
 {id:"demo-de-01",company_name:"Importateur Démo Rhin 01",country:"Germany",city:"Hamburg",focus:"French regional wines",channel:"Wholesale"},
 {id:"demo-de-02",company_name:"Importateur Démo Rhin 02",country:"Germany",city:"Berlin",focus:"Organic wines",channel:"Wine shops"},
 {id:"demo-nl-01",company_name:"Importateur Démo Delta 01",country:"Netherlands",city:"Amsterdam",focus:"Independent estates",channel:"Restaurants"},
 {id:"demo-gb-01",company_name:"Importateur Démo Albion 01",country:"United Kingdom",city:"London",focus:"Premium regional wines",channel:"On-trade"}
] as const;
const extras:Record<string,{wine_styles:string[],wine_origins:string[],organic:boolean,distribution_channels:string[],price_positioning:string}> = {
 "demo-dk-01":{wine_styles:["red","white"],wine_origins:["France"],organic:false,distribution_channels:["retail","restaurants"],price_positioning:"mid-range"},
 "demo-dk-02":{wine_styles:["red","white","sparkling"],wine_origins:["France","Italy","Spain"],organic:true,distribution_channels:["retail"],price_positioning:"premium"},
 "demo-dk-03":{wine_styles:["red","rosé"],wine_origins:["France","Spain"],organic:false,distribution_channels:["restaurants"],price_positioning:"mid-range"},
 "demo-de-01":{wine_styles:["red","white"],wine_origins:["France"],organic:false,distribution_channels:["wholesale"],price_positioning:"mid-range"},
 "demo-de-02":{wine_styles:["white","sparkling"],wine_origins:["France","Germany"],organic:true,distribution_channels:["retail"],price_positioning:"premium"},
 "demo-nl-01":{wine_styles:["red","white","rosé"],wine_origins:["France","Italy"],organic:true,distribution_channels:["restaurants"],price_positioning:"premium"},
 "demo-gb-01":{wine_styles:["red","sparkling"],wine_origins:["France","Italy"],organic:false,distribution_channels:["restaurants"],price_positioning:"premium"}
};
const profiles=data.map(r=>({...r,...extras[r.id]}));
const styles=z.enum(["red","white","rosé","sparkling"]);
const channels=z.enum(["retail","restaurants","wholesale"]);
const opportunities=[
 {id:"demo-opp-01",country:"Denmark",wine_styles:["white","sparkling"],wine_origins:["France"],organic:true,requirements:"Independent estate with organic certification",price_range_eur:[5,9]},
 {id:"demo-opp-02",country:"Germany",wine_styles:["red"],wine_origins:["France"],organic:false,requirements:"Regional wines for specialist wholesale",price_range_eur:[4,7]},
 {id:"demo-opp-03",country:"Netherlands",wine_styles:["rosé","white"],wine_origins:["France","Italy"],organic:true,requirements:"Restaurant-oriented portfolio",price_range_eur:[6,10]}
];
const campaigns=[
 {id:"demo-campaign-01",name:"Danemark — domaine fictif",country:"Denmark",status:"completed",sent:100,opens:42,clicks:11,replies:4,bounces:3},
 {id:"demo-campaign-02",name:"Allemagne — domaine fictif",country:"Germany",status:"completed",sent:80,opens:30,clicks:7,replies:2,bounces:2}
];
const aliases:Record<string,string>={danemark:"denmark",dk:"denmark",allemagne:"germany",de:"germany","pays-bas":"netherlands",nl:"netherlands","royaume-uni":"united kingdom",uk:"united kingdom",gb:"united kingdom"};
const normalize=(s:string)=>{const v=s.trim().toLowerCase();return Object.hasOwn(aliases,v)?aliases[v]:v;};
const byCountry=(s:string)=>profiles.filter(r=>r.country.toLowerCase()===normalize(s));
const output=(value:unknown)=>({content:[{type:"text" as const,text:JSON.stringify({demo:true,notice:"Fictional sample data only. Do not treat these companies or counts as real WineExporters records.",data:value})}]});
const hints={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const meta={securitySchemes:[{type:"noauth"}]};
const country=z.string().trim().min(2).max(70);
function buildServer(){
 const server=new McpServer({name:"WineExporters Demo",version:"0.2.0"},{instructions:"This public test server uses fictional examples only. Explicitly label every answer based on these tools as a demo."});
 server.registerTool("search_importers",{title:"Search fictional importers by filters",description:"DEMO ONLY. Filter by country, optional company, wine style, distribution channel and organic focus. Styles and channels use English enum values.",inputSchema:{country,company_name:z.string().trim().min(1).max(80).optional(),wine_style:styles.optional(),channel:channels.optional(),organic:z.boolean().optional(),limit:z.number().int().min(1).max(10).default(5)},annotations:hints,_meta:meta},async ({country,company_name,wine_style,channel,organic,limit})=>output(byCountry(country).filter(r=>(!company_name||r.company_name.toLowerCase().includes(company_name.toLowerCase()))&&(!wine_style||r.wine_styles.includes(wine_style))&&(!channel||r.distribution_channels.includes(channel))&&(organic===undefined||r.organic===organic)).slice(0,limit)));
 server.registerTool("get_importer_details",{title:"Read a fictional importer example",description:"DEMO ONLY. Get a sample record by ID from search.",inputSchema:{id:z.string().regex(/^demo-[a-z]{2}-\d{2}$/)},annotations:hints,_meta:meta},async ({id})=>output(profiles.find(r=>r.id===id)??null));
 server.registerTool("get_market_overview",{title:"Overview of fictional market sample",description:"DEMO ONLY. Count examples, not real market size.",inputSchema:{country},annotations:hints,_meta:meta},async ({country})=>output({country,sample_count:byCountry(country).length}));
 server.registerTool("recommend_importers",{title:"Rank fictional importers for a winery",description:"DEMO ONLY. Transparent heuristic score, not a purchase probability. Missing preferences are not scored.",inputSchema:{country,wine_style:styles,origin:z.string().trim().min(2).max(70),organic:z.boolean().optional(),channel:channels.optional(),limit:z.number().int().min(1).max(10).default(5)},annotations:hints,_meta:meta},async ({country,wine_style,origin,organic,channel,limit})=>{
 const ranked=byCountry(country).map(r=>{
 const factors=[{criterion:"wine_style",weight:40,match:r.wine_styles.includes(wine_style)},{criterion:"origin",weight:30,match:r.wine_origins.some(o=>o.toLowerCase()===origin.toLowerCase()||(origin.toLowerCase()==="france"&&o==="France"))}];
 if(organic!==undefined)factors.push({criterion:"organic",weight:20,match:r.organic===organic});
 if(channel!==undefined)factors.push({criterion:"channel",weight:10,match:r.distribution_channels.includes(channel)});
 return {importer:r,score:Math.round(100*factors.reduce((n,f)=>n+(f.match?f.weight:0),0)/factors.reduce((n,f)=>n+f.weight,0)),factors};
 }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.importer.id.localeCompare(b.importer.id)).slice(0,limit);
 return output({score_type:"heuristic fit, not buyer intent",results:ranked});
 });
 server.registerTool("list_opportunities",{title:"List fictional purchasing opportunities",description:"DEMO ONLY. Browse invented buyer requests, never real open opportunities.",inputSchema:{country:country.optional(),wine_style:styles.optional()},annotations:hints,_meta:meta},async ({country,wine_style})=>output(opportunities.filter(r=>(!country||r.country.toLowerCase()===normalize(country))&&(!wine_style||r.wine_styles.includes(wine_style)))));
 server.registerTool("get_campaign_results",{title:"Read fictional campaign statistics",description:"DEMO ONLY. Show illustrative campaign metrics, never real customer campaigns.",inputSchema:{country:country.optional(),campaign_id:z.string().regex(/^demo-campaign-\d{2}$/).optional()},annotations:hints,_meta:meta},async ({country,campaign_id})=>output(campaigns.filter(r=>(!country||r.country.toLowerCase()===normalize(country))&&(!campaign_id||r.id===campaign_id)).map(r=>({...r,open_rate_percent:Math.round(1000*r.opens/r.sent)/10,click_rate_percent:Math.round(1000*r.clicks/r.sent)/10,reply_rate_percent:Math.round(1000*r.replies/r.sent)/10}))));
 return server;
}
Deno.serve(async req=>{
 const url=new URL(req.url);
 if(req.method==="GET"&&url.pathname.endsWith("/health"))return Response.json({status:"ok",version:"0.2.0",mode:"public-fictional-demo",tools:6});
 if(req.method==="POST"){
 const length=Number(req.headers.get("content-length")??0);
 if(length>65536)return new Response("Payload too large",{status:413});
 }
 const server=buildServer();
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 try{await server.connect(transport);return await transport.handleRequest(req);}catch{return Response.json({error:"service_unavailable"},{status:503});}
});