import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Rocket } from 'lucide-react';

interface CampaignStatusBannerProps {
  status: string;
  validatedAt?: string;
  prospectCount?: number;
}

export const CampaignStatusBanner = ({ 
  status, 
  validatedAt, 
  prospectCount = 0 
}: CampaignStatusBannerProps) => {
  
  const getValidationDate = () => {
    if (!validatedAt) return null;
    return new Date(validatedAt);
  };

  const getDaysSinceValidation = () => {
    const validation = getValidationDate();
    if (!validation) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - validation.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isWithinSevenDays = () => {
    return getDaysSinceValidation() <= 7;
  };

  if (status === 'pending_validation') {
    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="font-medium mb-2">En attente de validation</div>
          <p className="text-sm">
            Notre équipe prépare votre campagne sous 72h. Vous recevrez une notification 
            à la validation. Sous 7 jours, les importateurs intéressés apparaîtront dans 
            votre espace Prospects.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'approved' && isWithinSevenDays() && prospectCount === 0) {
    return (
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="font-medium mb-2">Campagne validée</div>
          <p className="text-sm">
            Les prospects seront ajoutés par notre équipe sous 7 jours après la validation.
            <Badge variant="outline" className="ml-2">
              Jour {getDaysSinceValidation()}/7
            </Badge>
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'sending') {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50">
        <Rocket className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="font-medium mb-2">Campagne en cours d'envoi</div>
          <p className="text-sm">
            Votre campagne est actuellement en cours d'envoi vers {prospectCount} prospects.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'failed') {
    return (
      <Alert className="mb-6 border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="font-medium mb-2">Campagne refusée</div>
          <p className="text-sm">
            Votre campagne a été refusée. Consultez les commentaires de l'équipe 
            ou contactez le support pour plus d'informations.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};