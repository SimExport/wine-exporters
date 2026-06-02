import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UserOption {
  user_id: string;
  contact_name: string | null;
  domain_name: string | null;
}

const MAX_SIZE = 25 * 1024 * 1024;

export function AdminCampaignReportUpload() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userId, setUserId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, contact_name, domain_name')
        .order('domain_name', { ascending: true });
      if (data) setUsers(data as UserOption[]);
    })();
  }, []);

  const reset = () => {
    setUserId('');
    setCampaignName('');
    setFile(null);
  };

  const handleFile = (f: File | null) => {
    if (!f) return setFile(null);
    const ok = /\.(html?|pdf)$/i.test(f.name);
    if (!ok) {
      toast({ title: t('common.error'), description: t('adminCampaigns.upload.invalidFormat'), variant: 'destructive' });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast({ title: t('common.error'), description: t('adminCampaigns.upload.tooLarge'), variant: 'destructive' });
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!userId || !campaignName.trim() || !file) {
      toast({ title: t('common.error'), description: t('adminCampaigns.upload.fillAll'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${userId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('campaign-reports')
        .upload(path, file, { contentType: file.type || (ext === 'pdf' ? 'application/pdf' : 'text/html'), upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('campaign-reports').getPublicUrl(path);
      const fileUrl = pub.publicUrl;

      const { data: inserted, error: insErr } = await supabase
        .from('campaign_reports')
        .insert({
          user_id: userId,
          campaign_name: campaignName.trim(),
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          file_format: ext,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const { error: notifyErr } = await supabase.functions.invoke('notify-campaign-report', {
        body: { record: inserted },
      });

      if (notifyErr) {
        console.error('notify-campaign-report failed', notifyErr);
        toast({
          title: t('adminCampaigns.upload.successTitle'),
          description: 'Rapport uploadé, mais l\'envoi de la notification a échoué.',
          variant: 'destructive',
        });
      } else {
        toast({ title: t('adminCampaigns.upload.successTitle'), description: t('adminCampaigns.upload.successDesc') });
      }
      reset();
    } catch (e: any) {
      console.error('Upload error', e);
      toast({ title: t('common.error'), description: e.message || t('adminCampaigns.upload.error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('adminCampaigns.upload.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-1">
            <Label>{t('adminCampaigns.upload.client')}</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder={t('adminCampaigns.upload.selectClient')} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {users.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.domain_name || u.contact_name || u.user_id.slice(0, 8)}
                    {u.contact_name && u.domain_name ? ` — ${u.contact_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('adminCampaigns.upload.campaignName')}</Label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t('adminCampaigns.upload.campaignPlaceholder')}
              maxLength={200}
            />
          </div>
          <div>
            <Label>{t('adminCampaigns.upload.file')}</Label>
            <Input
              type="file"
              accept=".html,.htm,.pdf,application/pdf,text/html"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {t('adminCampaigns.upload.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}