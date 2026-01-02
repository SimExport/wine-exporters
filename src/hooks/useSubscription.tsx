import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'free' | 'paid';

export const useSubscription = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [campaignsRemaining, setCampaignsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscriptionPlan(null);
      setCampaignsRemaining(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_plan, campaigns_remaining')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscriptionPlan('none');
        setCampaignsRemaining(0);
      } else {
        setSubscriptionPlan(data?.subscription_plan || 'none');
        setCampaignsRemaining(data?.campaigns_remaining || 0);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscriptionPlan('none');
      setCampaignsRemaining(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Determine subscription tier
  const tier: SubscriptionTier = 
    subscriptionPlan && subscriptionPlan !== 'none' ? 'paid' : 'free';

  // Check if user has paid access (paid subscription OR admin)
  const hasPaidAccess = isAdmin || tier === 'paid';

  // Check if user is free tier (not admin and no subscription)
  const isFreeUser = !isAdmin && tier === 'free';

  // Check if user can launch a campaign (has campaigns remaining or is admin)
  const canLaunchCampaign = isAdmin || (hasPaidAccess && campaignsRemaining > 0);

  // Function to decrement campaigns remaining
  const decrementCampaignsRemaining = async (): Promise<boolean> => {
    if (!user || campaignsRemaining <= 0) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ campaigns_remaining: campaignsRemaining - 1 })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error decrementing campaigns:', error);
        return false;
      }

      setCampaignsRemaining(prev => prev - 1);
      return true;
    } catch (error) {
      console.error('Error decrementing campaigns:', error);
      return false;
    }
  };

  return {
    subscriptionPlan,
    tier,
    hasPaidAccess,
    isFreeUser,
    isAdmin,
    campaignsRemaining,
    canLaunchCampaign,
    decrementCampaignsRemaining,
    refetch: fetchSubscription,
    loading: loading || roleLoading,
  };
};
