// Sitemap XML public des articles SEO publiés (published + date passée).
// Aucun JavaScript côté client requis ; accessible sans authentification.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://wine-exporters.com";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("seo_articles")
    .select("slug, updated_at, canonical_url")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .order("published_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("sitemap-articles error", error);
    return new Response("Error", { status: 500 });
  }

  const urls = (data ?? []).map((a) => {
    const loc = a.canonical_url || `${SITE_URL}/ressources/${a.slug}`;
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${new Date(a.updated_at).toISOString()}</lastmod>\n  </url>`;
  });

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");

  return new Response(req.method === "HEAD" ? null : xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
