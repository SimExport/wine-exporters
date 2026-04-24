import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Target, Wine, FileText, Mail, Calendar } from "lucide-react"
import { useTranslation } from "react-i18next"
import { fr, enUS } from "date-fns/locale"
import { format } from "date-fns"

interface CampaignSidebarProps {
  data: {
    markets: string[]
    channels: string[]
    segments: string[]
    volumeBand: string
    priceRange: { min: number; max: number }
    language: string
    audienceEstimate: number
    cuvees: string[]
    hasPresentationDoc: boolean
    hasPricelistDoc: boolean
    subject: string
    scheduleAt?: Date
  }
}

export function CampaignSidebar({ data }: CampaignSidebarProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('en') ? enUS : fr
  return (
    <div className="w-80 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Globe className="w-4 h-4 mr-2" />
            {t('campaigns.sidebar.marketsCard')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.markets.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.marketsLabel')}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.markets.slice(0, 3).map((market) => (
                  <Badge key={market} variant="outline" className="text-xs">
                    {market}
                  </Badge>
                ))}
                {data.markets.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{data.markets.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {data.channels.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.channelsLabel')}</p>
              <p className="text-sm">{data.channels.join(', ')}</p>
            </div>
          )}
          
          {data.audienceEstimate > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.audienceLabel')}</p>
              <p className="text-sm font-medium text-primary">
                {t('campaigns.sidebar.audienceContacts', { count: data.audienceEstimate })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Wine className="w-4 h-4 mr-2" />
            {t('campaigns.sidebar.winesDocsCard')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.cuvees.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.winesLabel')}</p>
              <p className="text-sm">{data.cuvees.join(', ')}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.noWines')}</p>
          )}
          
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3" />
            <span className="text-xs">
              {t('campaigns.sidebar.presentation', { value: data.hasPresentationDoc ? '✓' : '✗' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3" />
            <span className="text-xs">
              {t('campaigns.sidebar.pricelist', { value: data.hasPricelistDoc ? '✓' : '✗' })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            {t('campaigns.sidebar.messageCard')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.subject && (
            <div>
              <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.subject')}</p>
              <p className="text-xs">{data.subject}</p>
            </div>
          )}
          
          <div>
            <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.language')}</p>
            <Badge variant="outline" className="text-xs">
              {data.language}
            </Badge>
          </div>
          
          {data.scheduleAt && (
            <div>
              <p className="text-xs text-muted-foreground">{t('campaigns.sidebar.scheduledFor')}</p>
              <p className="text-xs">{format(data.scheduleAt, 'dd/MM/yyyy', { locale: dateLocale })}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}