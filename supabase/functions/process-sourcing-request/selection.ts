// Selection helpers for WineExporters sourcing. No enrichment completion-status gate.
export function normalizeText(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
export function companyKey(name: unknown): string {
  return normalizeText(name).replace(/\b(gmbh|co|kg|ltd|limited|bv|sa|sarl|sprl|srl|inc|llc|ohg|ug|ag|weinimport)\b/g,"").trim().replace(/\s+/g," ");
}
export function websiteKey(value: unknown): string {
  try {
    const raw=String(value ?? "").trim(); if(!raw) return "";
    const url=new URL(/^https?:\/\//i.test(raw)?raw:"https://"+raw);
    return url.hostname.toLowerCase().replace(/^www\./,"");
  } catch {return "";}
}
export function emailKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}
const REGION_NAMES=[
  "Bordeaux","Castillon","Saint Emilion","Medoc","Alsace","Bourgogne","Champagne",
  "Rhone","Loire","Provence","Languedoc","Roussillon","Beaujolais","Jura","Savoie",
  "Sud Ouest","Cahors","Bergerac","Bourgogne","Chablis","Burgundy","Bordeaux",
  "Toscane","Tuscany","Piemont","Piedmont","Rioja","Ribera del Duero","Douro",
];
const LOW_NO=/\b(no low|no alcohol|low alcohol|alcohol free|alcoholfree|sans alcool|desalcoolis|non alcoolis|zero alcool|zero alcohol)\b/;
function values(x: unknown): string[] {return Array.isArray(x)?x.filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim()):[];}
function containsAny(haystack: unknown, patterns: string[]): boolean {
 const v=normalizeText(haystack);return patterns.some(k=>v.includes(normalizeText(k)));
}
export function matchingRegions(profile: any,wines: any[],enrichment: any): string[] {
  const estate=normalizeText([profile?.aoc,profile?.location,...wines.map(w=>w.appellation)].join(" "));
  const preferred=REGION_NAMES.filter(r=>estate.includes(normalizeText(r)));
  if(estate.includes("castillon")||estate.includes("saint emilion")||estate.includes("medoc"))preferred.push("Bordeaux");
  const available=[...values(enrichment?.wine_regions),...values(enrichment?.wine_appellations)];
  const result=new Set<string>();
  for(const region of available){
    const rv=normalizeText(region);
    if(preferred.some(p=>rv.includes(normalizeText(p))||normalizeText(p).includes(rv)))result.add(region);
  }
  return Array.from(result).slice(0,5);
}
function matchesNoLow(profile: any,wines: any[],enrichment: any): boolean {
  const target=normalizeText([profile?.target_buyer_description,...wines.map(w=>w.name+" "+w.appellation)].join(" "));
  if(!LOW_NO.test(target))return false;
  return LOW_NO.test(normalizeText([...values(enrichment?.wine_styles),...values(enrichment?.wine_specialties),
   enrichment?.description_fr,enrichment?.description_en].join(" ")));
}
export function relevance(contact:any, enrichment:any, profile:any,wines:any[]):number {
 const combined=normalizeText([enrichment?.company_type,...values(enrichment?.distribution_channels),
    enrichment?.description_fr,enrichment?.description_en].join(" "));
 const channels=normalizeText(values(enrichment?.distribution_channels).join(" "));
 let n=0;
 const regions=matchingRegions(profile,wines,enrichment);
 if(regions.length)n+=12;
 if(containsAny(combined,["importateur","importer","weinimport","wine import","importation directe"]))n+=5;
 if(containsAny(combined,["grossiste","wholesale","distributeur","distributor","b2b"]))n+=5;
 if(containsAny(channels,["CHR","restaurant","on trade","horeca","cavistes","specialist retail"]))n+=4;
 if(enrichment?.direct_import_status==="confirmed")n+=6;
 else if(enrichment?.direct_import_status==="probable")n+=3;
 if(matchesNoLow(profile,wines,enrichment))n+=5;
 if(containsAny(combined,["organic wines","vins bio","organic wine","biologique","biowein"])
   && wines.some(w=>w.organic===true))n+=2;
 if(containsAny(combined,["caviste","wine shop","wine retailer","wine merchant"]))n+=1;
 if(enrichment?.company_type)n+=2;
 if(enrichment?.description_fr||enrichment?.description_en)n+=1;
 if(containsAny(combined,["distillerie","distillery","cocktail bar","bar a cocktails"])
   && !containsAny(combined,["wine","vin","wein"]))n-=12;
 if(containsAny(combined,["supermarket","supermarche","hypermarche"]))n-=5;
 if(enrichment?.direct_import_status==="no")n-=3;
 if(!contact.company_name)n-=30;
 return n;
}
export function evidenceReason(contact:any, e:any, profile:any,wines:any[]):string {
 const facts:string[]=[];
 const regs=matchingRegions(profile,wines,e);
 if(e?.direct_import_status==="confirmed")facts.push("Importation directe mentionnée comme confirmée dans la fiche");
 else if(e?.direct_import_status==="probable")facts.push("Importation directe indiquée comme probable");
 if(regs.length)facts.push("Portefeuille mentionnant "+regs.slice(0,3).join(", "));
 if(values(e?.distribution_channels).length)facts.push("Circuits indiqués : "+values(e.distribution_channels).slice(0,3).join(", "));
 if(matchesNoLow(profile,wines,e))facts.push("Activité no/low mentionnée");
 if(!facts.length && e?.company_type)facts.push("Activité déclarée : "+String(e.company_type).slice(0,95));
 if(!facts.length && e?.wine_regions?.length)facts.push("Régions présentes dans la fiche : "+values(e.wine_regions).slice(0,3).join(", "));
 if(!facts.length && (e?.description_fr||e?.description_en))facts.push("Entreprise disposant d'une description commerciale, adéquation précise à confirmer");
 return facts.slice(0,3).join(". ")+(facts.length?".":"");
}
export function rankCandidates(contacts:any[], data:Map<string,any>, profile:any,wines:any[], previous:{names:Set<string>,sites:Set<string>,emails:Set<string>}):any[] {
 const ranked=contacts.map(c=>{
  const e=data.get(c.id)||null;
  return {...c,enrichment:e,priority:relevance(c,e,profile,wines)};
 }).filter(c=>c.company_name&&(
   !previous.names.has(companyKey(c.company_name)) &&
   !(websiteKey(c.website_url)&&previous.sites.has(websiteKey(c.website_url))) &&
   !(emailKey(c.email)&&previous.emails.has(emailKey(c.email)))
 )).sort((a,b)=>b.priority-a.priority||Number(!!b.enrichment)-Number(!!a.enrichment)||
    String(a.company_name).localeCompare(String(b.company_name)));
 const unique:any[]=[];const names=new Set<string>(),domains=new Set<string>();
 for(const c of ranked){
   const name=companyKey(c.company_name);const domain=websiteKey(c.website_url);
   if(names.has(name)||(domain&&domains.has(domain)))continue;
   unique.push(c);names.add(name);if(domain)domains.add(domain);
 }
 return unique;
}
