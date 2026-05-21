import { supabase } from '@/integrations/supabase/client';

export const MANUAL_CAMPAIGN_NAME = 'Prospects manuels';

/**
 * Get or create the per-user system campaign used as container
 * for manually-added leads (CRM) and prospects imported from
 * a Recherche sur-mesure result.
 */
export async function getOrCreateManualCampaign(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', userId)
    .eq('name', MANUAL_CAMPAIGN_NAME)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: MANUAL_CAMPAIGN_NAME,
      status: 'manual',
      target_markets: [],
      managed_by_bo: false,
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}