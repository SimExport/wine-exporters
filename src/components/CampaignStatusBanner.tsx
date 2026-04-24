import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  
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
          <div className="font-medium mb-2">{t('campaigns.banner.pendingTitle')}</div>
          <p className="text-sm">{t('campaigns.banner.pendingMessage')}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'approved' && isWithinSevenDays() && prospectCount === 0) {
    return (
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="font-medium mb-2">{t('campaigns.banner.approvedTitle')}</div>
          <p className="text-sm">
            {t('campaigns.banner.approvedMessage')}
            <Badge variant="outline" className="ml-2">
              {t('campaigns.banner.approvedDay', { day: getDaysSinceValidation() })}
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
          <div className="font-medium mb-2">{t('campaigns.banner.sendingTitle')}</div>
          <p className="text-sm">{t('campaigns.banner.sendingMessage', { count: prospectCount })}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'failed') {
    return (
      <Alert className="mb-6 border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="font-medium mb-2">{t('campaigns.banner.failedTitle')}</div>
          <p className="text-sm">{t('campaigns.banner.failedMessage')}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};