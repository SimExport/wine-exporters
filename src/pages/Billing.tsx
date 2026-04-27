import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar, Settings2, Crown, Loader2, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

const Billing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPaidAccess, campaignsRemaining, sourcingRequestsRemaining, loading: subscriptionLoading } = useSubscription();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    subscription_plan: string | null;
    subscription_end: string | null;
  } | null>(null);

  // Check for success/cancel params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success(t('billing.successToast'));
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info(t('billing.canceledToast'));
    }
  }, [searchParams]);

  // Check subscription on mount
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('billing.loginRequired'));
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error(t('billing.checkoutError'));
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(t('billing.checkoutError'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('billing.loginRequiredShort'));
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Portal error:', error);
        toast.error(t('billing.portalError'));
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error(t('billing.portalError'));
    } finally {
      setPortalLoading(false);
    }
  };

  const isSubscribed = subscriptionData?.subscribed || hasPaidAccess;

  const getStatusBadge = (status: 'active' | 'inactive' | 'past_due') => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{t('billing.status.active')}</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">{t('billing.status.pastDue')}</Badge>;
      default:
        return <Badge variant="outline">{t('billing.status.inactive')}</Badge>;
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* En-tête de page */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('billing.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('billing.subtitle')}
        </p>
      </div>

      <Separator />

      {/* Plan Selection for non-subscribers */}
      {!isSubscribed && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">{t('billing.premium.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('billing.premium.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-foreground">
                {t('billing.premium.price')} <span className="text-base font-normal text-muted-foreground">{t('billing.premium.priceUnit')}</span>
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t('billing.premium.feature1')}</li>
              <li>{t('billing.premium.feature2')}</li>
              <li>{t('billing.premium.feature3')}</li>
              <li>{t('billing.premium.feature4')}</li>
            </ul>
            <Button 
              onClick={handleCheckout} 
              disabled={checkoutLoading}
              className="w-full"
              size="lg"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('billing.loading')}
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  {t('billing.premium.subscribe')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Section Principale - Abonnement & Utilisation */}
      {isSubscribed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carte Mon Abonnement */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('billing.subscription.title')}</CardTitle>
                {getStatusBadge('active')}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-foreground">{t('billing.subscription.planName')}</p>
                <p className="text-3xl font-bold mt-1 text-primary">
                  {t('billing.premium.price')} <span className="text-base font-normal text-muted-foreground">{t('billing.premium.priceUnit')}</span>
                </p>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>{t('billing.subscription.renewal')}</span>
              </div>

              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('billing.loading')}
                    </>
                  ) : (
                    <>
                      <Settings2 className="h-4 w-4 mr-2" />
                      {t('billing.subscription.manage')}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t('billing.subscription.manageHelp')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Carte Utilisation du forfait */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('billing.usage.title')}</CardTitle>
              <CardDescription>{t('billing.usage.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('billing.usage.campaignsLabel')}</span>
                  <span className="text-muted-foreground">{campaignsRemaining ?? 0}/1</span>
                </div>
                <Progress value={((campaignsRemaining ?? 0) / 1) * 100} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {campaignsRemaining === 0 
                    ? t('billing.usage.campaignsUsed')
                    : t('billing.usage.campaignsAvailable', { count: campaignsRemaining ?? 0 })
                  }
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('billing.usage.sourcingLabel')}</span>
                  <span className="text-muted-foreground">{sourcingRequestsRemaining ?? 0}/1</span>
                </div>
                <Progress value={((sourcingRequestsRemaining ?? 0) / 1) * 100} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {sourcingRequestsRemaining === 0
                    ? t('billing.usage.sourcingUsed')
                    : t('billing.usage.sourcingAvailable', { count: sourcingRequestsRemaining ?? 0 })
                  }
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  {t('billing.usage.renewInfo')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Billing;
