// The gateway passes /<function>/...; local/full URLs can retain /functions/v1/<function>/....
// Map only exact function boundaries onto a configured public URL, never an incoming Host header.
export function publicFunctionRequest(req:Request,slug:string,canonicalBase:string){
 const u=new URL(req.url);let suffix=u.pathname;
 for(const prefix of ['/functions/v1/'+slug,'/'+slug]){
  if(suffix===prefix||suffix.startsWith(prefix+'/')){suffix=suffix.slice(prefix.length);break;}
 }
 return new Request(canonicalBase+suffix+u.search,req);
}
