import { useState } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCampaignReports, CampaignReport } from '@/hooks/useCampaignReports';
import { useTranslation } from 'react-i18next';

export function CampaignReportsSection() {
  const { t, i18n } = useTranslation();
  const { reports, loading } = useCampaignReports();
  const [openReport, setOpenReport] = useState<CampaignReport | null>(null);

  if (loading || reports.length === 0) return null;

  const locale = i18n.language.startsWith('en') ? 'en-US' : 'fr-FR';

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t('campaigns.report.sectionTitle')}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {reports.map((r) => (
              <Card key={r.id} className="bg-background">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 mb-2">
                        <FileText className="h-3 w-3 mr-1" />
                        {t('campaigns.report.badge')}
                      </Badge>
                      <h3 className="font-semibold truncate">{r.campaign_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('campaigns.report.availableSince', {
                          date: new Date(r.created_at).toLocaleDateString(locale),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setOpenReport(r)} className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      {t('campaigns.report.view')}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={r.file_url} download={r.file_name || undefined} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        {t('campaigns.report.download')}
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!openReport} onOpenChange={(o) => !o && setOpenReport(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{openReport?.campaign_name}</DialogTitle>
          </DialogHeader>
          {openReport && (
            <iframe
              src={openReport.file_url}
              className="flex-1 w-full"
              title={openReport.campaign_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}