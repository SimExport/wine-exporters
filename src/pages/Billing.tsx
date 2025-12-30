import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Building2, Download, Calendar, FileText, Settings2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mock data - à remplacer par des appels Supabase
const mockSubscription = {
  planName: 'ExportVins Premium',
  price: 149,
  currency: 'EUR',
  status: 'active' as const,
  nextBillingDate: addMonths(new Date(), 1)
};
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
}, {
  id: '3',
  date: new Date(2024, 9, 27),
  description: 'Abonnement Mensuel - ExportVins Premium',
  amount: 149.00,
  status: 'paid' as const
}, {
  id: '4',
  date: new Date(2024, 8, 27),
  description: 'Abonnement Mensuel - ExportVins Premium',
  amount: 149.00,
  status: 'paid' as const
}];
const Billing = () => {
  const [subscription] = useState(mockSubscription);
  const [usage] = useState(mockUsage);
  const [paymentMethod] = useState(mockPaymentMethod);
  const [billingAddress] = useState(mockBillingAddress);
  const [invoices] = useState(mockInvoices);
  const usagePercentage = usage.campaignsUsed / usage.campaignsTotal * 100;
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
  return <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* En-tête de page */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Facturation & Abonnement</h1>
        <p className="text-muted-foreground mt-2">
          Gérez votre forfait, vos moyens de paiement et téléchargez vos factures.
        </p>
      </div>

      <Separator />

      {/* Section Principale - Abonnement & Utilisation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte Mon Abonnement */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Mon Abonnement</CardTitle>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{subscription.planName}</p>
              <p className="text-3xl font-bold mt-1 text-primary">
                {subscription.price}€ <span className="text-base font-normal text-muted-foreground">HT / mois</span>
              </p>
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                Prochaine facture le {format(subscription.nextBillingDate, 'd MMMM yyyy', {
                locale: fr
              })}
              </span>
            </div>

            <Button variant="outline" className="w-full">
              <Settings2 className="h-4 w-4 mr-2" />
              Gérer mon abonnement
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
                <span className="text-muted-foreground">{usage.campaignsUsed}/{usage.campaignsTotal}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {usage.campaignsUsed}/{usage.campaignsTotal} Campagne envoyée ce mois-ci
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Remise à zéro le 1er du mois ({format(usage.resetDate, 'd MMMM yyyy', {
                locale: fr
              })})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Informations - Paiement & Adresse */}
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
                  {paymentMethod.brand} terminant par {paymentMethod.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expire le {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full">
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
                <p className="font-medium text-foreground">{billingAddress.companyName}</p>
                <p className="text-sm text-muted-foreground">{billingAddress.address}</p>
                <p className="text-sm text-muted-foreground">{billingAddress.city}, {billingAddress.country}</p>
                <p className="text-sm text-muted-foreground">TVA : {billingAddress.vatNumber}</p>
              </div>
            </div>

            <Button variant="outline" className="w-full">
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
              {invoices.map(invoice => <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {format(invoice.date, 'd MMM yyyy', {
                  locale: fr
                })}
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
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
};
export default Billing;