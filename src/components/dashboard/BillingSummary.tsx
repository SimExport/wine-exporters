import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, CreditCard, Download, ExternalLink, Loader2, Receipt, Settings2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  number: string | null;
  created: number;
  period_start: number;
  period_end: number;
  amount_paid: number;
  currency: string;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string | null;
}

interface SubData {
  subscribed: boolean;
  subscription_plan: string | null;
  subscription_end: string | null;
}

export const BillingSummary = () => {
  const { t, i18n } = useTranslation();
  const { hasPaidAccess, campaignsRemaining, sourcingRequestsRemaining, subscriptionPlan } = useSubscription();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subData, setSubData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [subRes, invRes] = await Promise.all([
          supabase.functions.invoke('check-subscription'),
          supabase.functions.invoke('list-invoices'),
        ]);
        if (subRes.data) setSubData(subRes.data as SubData);
        if (invRes.data?.invoices) setInvoices(invRes.data.invoices as Invoice[]);
      } catch (e) {
        console.error('BillingSummary load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (e) {
      toast.error(t('billing.portalError'));
    } finally {
      setPortalLoading(false);
    }
  };

  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR';
  const fmtDate = (d: string | number | null | undefined) => {
    if (!d) return '—';
    const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d);
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const fmtAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

  const isActive = hasPaidAccess && (subData?.subscribed ?? subscriptionPlan !== 'none');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('billingSummary.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('billingSummary.subtitle')}</p>
        </div>
        {isActive && (
          <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings2 className="h-4 w-4 mr-2" />}
            {t('billingSummary.manage')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Statut abonnement */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('billingSummary.subscription.title')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isActive ? (
              <>
                <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                  {t('billingSummary.subscription.active')}
                </Badge>
                <p className="text-base font-semibold text-foreground">
                  {t('billing.subscription.planName')}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  {subData?.subscription_end
                    ? t('billingSummary.subscription.renewsOn', { date: fmtDate(subData.subscription_end) })
                    : t('billingSummary.subscription.renewsMonthly')}
                </div>
              </>
            ) : (
              <>
                <Badge variant="outline">{t('billingSummary.subscription.inactive')}</Badge>
                <p className="text-xs text-muted-foreground">{t('billingSummary.subscription.inactiveHint')}</p>
                <Button asChild size="sm" className="w-full mt-1">
                  <Link to="/billing"><Sparkles className="h-4 w-4 mr-2" />{t('dashboardPage.upgradeCard.cta')}</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Campagnes restantes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('billingSummary.usage.campaignsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{campaignsRemaining ?? 0}</span>
              <span className="text-sm text-muted-foreground">/ {t('billingSummary.usage.perMonth')}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(campaignsRemaining ?? 0) > 0
                ? t('billingSummary.usage.campaignsAvailable')
                : t('billingSummary.usage.campaignsExhausted')}
            </p>
          </CardContent>
        </Card>

        {/* Recherches sur-mesure */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('billingSummary.usage.sourcingTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{sourcingRequestsRemaining ?? 0}</span>
              <span className="text-sm text-muted-foreground">/ {t('billingSummary.usage.perMonth')}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(sourcingRequestsRemaining ?? 0) > 0
                ? t('billingSummary.usage.sourcingAvailable')
                : t('billingSummary.usage.sourcingExhausted')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historique des paiements / packs achetés */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t('billingSummary.invoices.title')}
              </CardTitle>
              <CardDescription>{t('billingSummary.invoices.subtitle')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              {t('billingSummary.invoices.empty')}
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.number ?? inv.id}
                      </p>
                      {inv.status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">
                          {t('billingSummary.invoices.paid')}
                        </Badge>
                      ) : inv.status === 'open' ? (
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 text-xs">
                          {t('billingSummary.invoices.open')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{inv.status}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(inv.created)} · {t('billingSummary.invoices.period', {
                        start: fmtDate(inv.period_start),
                        end: fmtDate(inv.period_end),
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {fmtAmount(inv.amount_paid, inv.currency)}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {inv.invoice_pdf && (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center"
                        >
                          <Download className="h-3 w-3 mr-1" />PDF
                        </a>
                      )}
                      {inv.hosted_invoice_url && (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />{t('billingSummary.invoices.view')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};