import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Building2, Download, Calendar, FileText, Settings2, Crown, Loader2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

const Billing = () => {
  const { user } = useAuth();
  const { hasPaidAccess, loading: subscriptionLoading } = useSubscription();
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
      toast.success('Abonnement activé avec succès !');
      // Refresh subscription status
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Paiement annulé');
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
        toast.error('Veuillez vous connecter pour souscrire');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Erreur lors de la création du paiement');
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Veuillez vous connecter');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Portal error:', error);
        toast.error('Erreur lors de l\'ouverture du portail');
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Erreur lors de l\'ouverture du portail');
    } finally {
      setPortalLoading(false);
    }
  };

  const isSubscribed = subscriptionData?.subscribed || hasPaidAccess;
  const subscriptionEnd = subscriptionData?.subscription_end 
    ? new Date(subscriptionData.subscription_end) 
    : addMonths(new Date(), 1);

  // Mock data for usage and invoices (will be replaced with real data later)
  const mockUsage = {
    campaignsUsed: 1,
    campaignsTotal: 1,
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  };

  const mockPaymentMethod = {
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2026
  };

  const mockBillingAddress = {
    companyName: 'Domaine de la Vigne',
    address: '123 Route des Vignes',
    city: '33000 Bordeaux',
    country: 'France',
    vatNumber: 'FR12345678901'
  };

  const mockInvoices = [{
    id: '1',
    date: new Date(2024, 11, 27),
    description: 'Abonnement Mensuel - ExportVins Premium',
    amount: 149.00,
    status: 'paid' as const
  }, {
    id: '2',
    date: new Date(2024, 10, 27),
    description: 'Abonnement Mensuel - ExportVins Premium',
    amount: 149.00,
    status: 'paid' as const
  }];

  const usagePercentage = mockUsage.campaignsUsed / mockUsage.campaignsTotal * 100;

  const getStatusBadge = (status: 'active' | 'inactive' | 'past_due') => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Actif</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">Impayé</Badge>;
      default:
        return <Badge variant="outline">Inactif</Badge>;
    }
  };

  const getInvoiceStatusBadge = (status: 'paid' | 'pending' | 'failed') => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">En attente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
        <h1 className="text-3xl font-bold text-foreground">Facturation & Abonnement</h1>
        <p className="text-muted-foreground mt-2">
          Gérez votre forfait, vos moyens de paiement et téléchargez vos factures.
        </p>
      </div>

      <Separator />

      {/* Plan Selection for non-subscribers */}
      {!isSubscribed && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Passer Premium</CardTitle>
            </div>
            <CardDescription>
              Accédez à 15 000+ acheteurs qualifiés dans le monde entier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-foreground">
                149€ <span className="text-base font-normal text-muted-foreground">HT / mois</span>
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Accès illimité à la base importateurs</li>
              <li>✓ 1 campagne de prospection par mois</li>
              <li>✓ CRM dédié pour gérer vos prospects</li>
              <li>✓ Support prioritaire</li>
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
                  Chargement...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Souscrire maintenant
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
                <CardTitle className="text-lg">Mon Abonnement</CardTitle>
                {getStatusBadge('active')}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-foreground">ExportVins Premium</p>
                <p className="text-3xl font-bold mt-1 text-primary">
                  149€ <span className="text-base font-normal text-muted-foreground">HT / mois</span>
                </p>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  Prochaine facture le {format(subscriptionEnd, 'd MMMM yyyy', { locale: fr })}
                </span>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Gérer mon abonnement
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Carte Utilisation du forfait */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Utilisation du forfait</CardTitle>
              <CardDescription>Quotas mensuels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Campagnes</span>
                  <span className="text-muted-foreground">{mockUsage.campaignsUsed}/{mockUsage.campaignsTotal}</span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {mockUsage.campaignsUsed}/{mockUsage.campaignsTotal} Campagne envoyée ce mois-ci
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Remise à zéro le 1er du mois ({format(mockUsage.resetDate, 'd MMMM yyyy', { locale: fr })})
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section Informations - Paiement & Adresse (only for subscribers) */}
      {isSubscribed && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Carte Moyen de paiement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Moyen de paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {mockPaymentMethod.brand} terminant par {mockPaymentMethod.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expire le {mockPaymentMethod.expMonth.toString().padStart(2, '0')}/{mockPaymentMethod.expYear}
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  Mettre à jour
                </Button>
              </CardContent>
            </Card>

            {/* Carte Adresse de facturation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adresse de facturation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{mockBillingAddress.companyName}</p>
                    <p className="text-sm text-muted-foreground">{mockBillingAddress.address}</p>
                    <p className="text-sm text-muted-foreground">{mockBillingAddress.city}, {mockBillingAddress.country}</p>
                    <p className="text-sm text-muted-foreground">TVA : {mockBillingAddress.vatNumber}</p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  Modifier
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Section Historique des factures */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Historique des factures</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInvoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {format(invoice.date, 'd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{invoice.description}</TableCell>
                      <TableCell className="text-right">
                        {invoice.amount.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} € HT
                      </TableCell>
                      <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Télécharger PDF</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Billing;
