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
  name: "list_leads",
  title: "List CRM leads",
  description: "List the signed-in user's CRM leads, optionally filtered by status or campaign.",
  inputSchema: {
    status: z.string().optional().describe("Filter by lead status (e.g. 'new', 'contacted', 'qualified', 'won', 'lost')."),
    campaign_id: z.string().uuid().optional().describe("Filter by campaign UUID."),
    limit: z.number().int().min(1).max(200).default(50).describe("Max number of leads to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, campaign_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supa(ctx)
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    if (campaign_id) q = q.eq("campaign_id", campaign_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { leads: data ?? [] },
    };
  },
});