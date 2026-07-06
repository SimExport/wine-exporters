import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCampaigns from "./tools/list-campaigns";
import listLeads from "./tools/list-leads";
import updateLeadStatus from "./tools/update-lead-status";
import appendLeadNote from "./tools/append-lead-note";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "wineexporters-mcp",
  title: "WineExporters",
  version: "0.1.0",
  instructions:
    "Tools to browse WineExporters campaigns and manage CRM leads for the signed-in user. Use list_campaigns and list_leads to explore, update_lead_status to move leads in the pipeline, and append_lead_note to record activity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCampaigns, listLeads, updateLeadStatus, appendLeadNote],
});