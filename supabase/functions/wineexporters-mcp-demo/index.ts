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
const aliases:Record<string,string>={danemark:"denmark",dk:"denmark",allemagne:"germany",de:"germany","pays-bas":"netherlands",nl:"netherlands","royaume-uni":"united kingdom",uk:"united kingdom",gb:"united kingdom"};
const normalize=(s:string)=>{const v=s.trim().toLowerCase();return Object.hasOwn(aliases,v)?aliases[v]:v;};
const byCountry=(s:string)=>data.filter(r=>r.country.toLowerCase()===normalize(s));
const output=(value:unknown)=>({content:[{type:"text" as const,text:JSON.stringify({demo:true,notice:"Fictional sample data only. Do not treat these companies or counts as real WineExporters records.",data:value})}]});
const hints={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const meta={securitySchemes:[{type:"noauth"}]};
const country=z.string().trim().min(2).max(70);
function buildServer(){
 const server=new McpServer({name:"WineExporters Demo",version:"0.1.3"},{instructions:"This public test server uses fictional examples only. Explicitly label every answer based on these tools as a demo."});
 server.registerTool("search_importers",{title:"Search fictional importer examples",description:"DEMO ONLY. Search sample importer records by country and optional name. No live data.",inputSchema:{country,company_name:z.string().trim().min(1).max(80).optional(),limit:z.number().int().min(1).max(10).default(5)},annotations:hints,_meta:meta},async ({country,company_name,limit})=>output(byCountry(country).filter(r=>!company_name||r.company_name.toLowerCase().includes(company_name.toLowerCase())).slice(0,limit)));
 server.registerTool("get_importer_details",{title:"Read a fictional importer example",description:"DEMO ONLY. Get a sample record by ID from search.",inputSchema:{id:z.string().regex(/^demo-[a-z]{2}-\d{2}$/)},annotations:hints,_meta:meta},async ({id})=>output(data.find(r=>r.id===id)??null));
 server.registerTool("get_market_overview",{title:"Overview of fictional market sample",description:"DEMO ONLY. Count examples, not real market size.",inputSchema:{country},annotations:hints,_meta:meta},async ({country})=>output({country,sample_count:byCountry(country).length}));
 return server;
}
Deno.serve(async req=>{
 const url=new URL(req.url);
 if(req.method==="GET"&&url.pathname.endsWith("/health"))return Response.json({status:"ok",version:"0.1.3",mode:"public-fictional-demo",tools:3});
 if(req.method==="POST"){
 const length=Number(req.headers.get("content-length")??0);
 if(length>65536)return new Response("Payload too large",{status:413});
 }
 const server=buildServer();
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 try{await server.connect(transport);return await transport.handleRequest(req);}catch{return Response.json({error:"service_unavailable"},{status:503});}
});