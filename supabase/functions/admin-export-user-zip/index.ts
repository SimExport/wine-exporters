import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { BlobWriter, Uint8ArrayReader, ZipWriter } from "https://deno.land/x/zipjs@v2.7.45/index.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function safe(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180) || "file";
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice("Bearer ".length);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body?.user_id || "");
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "missing_user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [docsRes, mediaRes] = await Promise.all([
      supabase.from("documents").select("file_url,file_name,category,cuvee").eq("user_id", targetUserId),
      supabase.from("media").select("file_url,title,type").eq("user_id", targetUserId),
    ]);

    const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

    const seen = new Set<string>();
    const addEntry = async (folder: string, baseName: string, url: string) => {
      if (!url) return;
      const bytes = await fetchBytes(url);
      if (!bytes) return;
      let path = `${folder}/${safe(baseName)}`;
      let i = 1;
      while (seen.has(path)) {
        const dot = path.lastIndexOf(".");
        path = dot > folder.length
          ? `${path.slice(0, dot)}_${i}${path.slice(dot)}`
          : `${path}_${i}`;
        i++;
      }
      seen.add(path);
      await zipWriter.add(path, new Uint8ArrayReader(bytes));
    };

    for (const d of (docsRes.data || [])) {
      const sub = d.category ? `documents/${safe(d.category)}` : "documents";
      await addEntry(sub, d.file_name || d.file_url.split("/").pop() || "doc", d.file_url);
    }
    for (const m of (mediaRes.data || [])) {
      const sub = m.type ? `media/${safe(m.type)}` : "media";
      const fname = (m.title ? `${m.title}` : (m.file_url.split("/").pop() || "media"));
      await addEntry(sub, fname, m.file_url);
    }

    const blob = await zipWriter.close();
    const ab = await blob.arrayBuffer();
    // base64 encode for safe JSON transport via supabase.functions.invoke
    const bytes = new Uint8Array(ab);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);

    return new Response(
      JSON.stringify({ zip_base64: base64, count_documents: docsRes.data?.length || 0, count_media: mediaRes.data?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});