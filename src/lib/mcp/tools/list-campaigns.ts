import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supa(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_campaigns",
  title: "List campaigns",
  description: "List the signed-in user's WineExporters campaigns, most recent first.",
  inputSchema: {
    status: z.string().optional().describe("Filter by campaign status (e.g. 'draft', 'launched', 'pending_validation')."),
    limit: z.number().int().min(1).max(100).default(20).describe("Max number of campaigns to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supa(ctx)
      .from("campaigns")
      .select("id, name, status, target_markets, created_at, launched_at, audience_estimate, stats_opens, stats_clicks, stats_replies")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { campaigns: data ?? [] },
    };
  },
});