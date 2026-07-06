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
  name: "append_lead_note",
  title: "Append note to lead",
  description: "Append a timestamped note to a CRM lead's owner_notes.",
  inputSchema: {
    lead_id: z.string().uuid().describe("UUID of the lead."),
    note: z.string().min(1).describe("Note text to append."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ lead_id, note }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = supa(ctx);
    const { data: existing, error: readErr } = await client
      .from("leads")
      .select("owner_notes")
      .eq("id", lead_id)
      .single();
    if (readErr) return { content: [{ type: "text", text: readErr.message }], isError: true };
    const stamp = new Date().toISOString();
    const prefix = existing?.owner_notes ? `${existing.owner_notes}\n\n` : "";
    const next = `${prefix}[${stamp}] ${note}`;
    const { data, error } = await client
      .from("leads")
      .update({ owner_notes: next })
      .eq("id", lead_id)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: "Note appended." }],
      structuredContent: { lead: data },
    };
  },
});