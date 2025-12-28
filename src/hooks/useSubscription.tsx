import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'free' | 'paid';

export const useSubscription = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscriptionPlan(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
          setSubscriptionPlan('none');
        } else {
          setSubscriptionPlan(data?.subscription_plan || 'none');
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscriptionPlan('none');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Determine subscription tier
  const tier: SubscriptionTier = 
    subscriptionPlan && subscriptionPlan !== 'none' ? 'paid' : 'free';

  // Check if user has paid access (paid subscription OR admin)
  const hasPaidAccess = isAdmin || tier === 'paid';

  // Check if user is free tier (not admin and no subscription)
  const isFreeUser = !isAdmin && tier === 'free';

  return {
    subscriptionPlan,
    tier,
    hasPaidAccess,
    isFreeUser,
    isAdmin,
    loading: loading || roleLoading,
  };
};
