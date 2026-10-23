import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROSPECT_SOURCES, type ProspectSource } from '@/lib/prospect-source'
import { MANUAL_CAMPAIGN_NAME } from '@/lib/manual-campaign'

interface Props {
  source: ProspectSource
  campaignId: string
  campaigns: { id: string; name: string }[]
  onSourceChange: (source: ProspectSource) => void
  onCampaignChange: (id: string) => void
}

export function ProspectSourceFields({ source, campaignId, campaigns, onSourceChange, onCampaignChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="prospect-source">{t('crm.createDialog.source')}</Label>
        <Select value={source} onValueChange={(value) => {
          const next = PROSPECT_SOURCES.find(item => item === value)
          if (next) onSourceChange(next)
        }}>
          <SelectTrigger id="prospect-source"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PROSPECT_SOURCES.map(item => (
              <SelectItem key={item} value={item}>{t(`crm.createDialog.sources.${item}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {source === 'campaign' && (
        <div className="space-y-1">
          <Label htmlFor="prospect-campaign">{t('crm.createDialog.campaign')}</Label>
          <Select value={campaignId} onValueChange={onCampaignChange}>
            <SelectTrigger id="prospect-campaign"><SelectValue placeholder={t('crm.createDialog.campaignPlaceholder')} /></SelectTrigger>
            <SelectContent>
              {campaigns.filter(item => item.name !== MANUAL_CAMPAIGN_NAME).map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}