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
  name: "update_lead_status",
  title: "Update lead status",
  description: "Update the status of a CRM lead (e.g. move it to 'contacted', 'qualified', 'won', 'lost').",
  inputSchema: {
    lead_id: z.string().uuid().describe("UUID of the lead to update."),
    status: z.string().min(1).describe("New status value."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ lead_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supa(ctx)
      .from("leads")
      .update({ status })
      .eq("id", lead_id)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Lead ${lead_id} updated to ${status}.` }],
      structuredContent: { lead: data },
    };
  },
});