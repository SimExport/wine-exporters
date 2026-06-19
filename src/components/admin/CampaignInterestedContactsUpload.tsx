import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, FileUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  campaignId: string;
  campaignName: string;
}

interface ParsedRow {
  company_name: string;
  email: string | null;
  contact_name: string | null;
  country: string | null;
  score: number | null;
  description: string | null;
  recommended_actions: string | null;
}

const REQUIRED_HEADERS = ['company_name'];
const KNOWN_HEADERS = [
  'company_name',
  'email',
  'contact_name',
  'country',
  'score',
  'description',
  'recommended_actions',
];

// Minimal CSV parser supporting quoted fields and escaped quotes ("")
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cur.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        cur.push(field);
        field = '';
        if (cur.length > 1 || (cur.length === 1 && cur[0] !== '')) rows.push(cur);
        cur = [];
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || cur.length) {
    cur.push(field);
    if (cur.length > 1 || (cur.length === 1 && cur[0] !== '')) rows.push(cur);
  }
  return rows;
}

export function CampaignInterestedContactsUpload({ campaignId, campaignName }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFile(null);
    setParsed([]);
    setParseError(null);
  };

  const handleFile = async (f: File | null) => {
    reset();
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      setParseError(t('adminCampaigns.interestedContacts.invalidCsv'));
      return;
    }
    setFile(f);
    try {
      const text = await f.text();
      const rows = parseCsv(text.replace(/^\uFEFF/, ''));
      if (rows.length < 2) {
        setParseError(t('adminCampaigns.interestedContacts.invalidCsv'));
        return;
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length) {
        setParseError(
          t('adminCampaigns.interestedContacts.missingColumns', { columns: missing.join(', ') }),
        );
        return;
      }
      const idx = (name: string) => headers.indexOf(name);
      const out: ParsedRow[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const get = (name: string) => {
          const i = idx(name);
          if (i < 0) return null;
          const v = (row[i] ?? '').trim();
          return v === '' ? null : v;
        };
        const company = get('company_name');
        if (!company) continue;
        const scoreRaw = get('score');
        let score: number | null = null;
        if (scoreRaw != null) {
          const n = Number(scoreRaw);
          if (!Number.isNaN(n)) score = Math.round(n);
        }
        out.push({
          company_name: company,
          email: get('email'),
          contact_name: get('contact_name'),
          country: get('country'),
          score,
          description: get('description'),
          recommended_actions: get('recommended_actions'),
        });
      }
      if (!out.length) {
        setParseError(t('adminCampaigns.interestedContacts.invalidCsv'));
        return;
      }
      setParsed(out);
    } catch (e) {
      console.error(e);
      setParseError(t('adminCampaigns.interestedContacts.invalidCsv'));
    }
  };

  const submit = async () => {
    if (!parsed.length) return;
    setSubmitting(true);
    try {
      const payload = parsed.map((r) => ({ ...r, campaign_id: campaignId }));
      const { error } = await supabase.from('campaign_interested_contacts').insert(payload);
      if (error) throw error;
      toast({
        title: t('adminCampaigns.interestedContacts.successTitle'),
        description: t('adminCampaigns.interestedContacts.successDesc', { count: parsed.length }),
      });
      setOpen(false);
      reset();
    } catch (e: any) {
      console.error(e);
      toast({
        title: t('common.error'),
        description: e?.message || t('adminCampaigns.interestedContacts.error'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileUp className="h-4 w-4 mr-1" />
          {t('adminCampaigns.interestedContacts.importBtn')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('adminCampaigns.interestedContacts.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('adminCampaigns.interestedContacts.dialogDesc', { campaign: campaignName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('adminCampaigns.interestedContacts.fileLabel')}</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('adminCampaigns.interestedContacts.expectedColumns', {
                columns: KNOWN_HEADERS.join(', '),
              })}
            </p>
          </div>
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          {parsed.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('adminCampaigns.interestedContacts.previewCount', { count: parsed.length })}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!parsed.length || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {t('adminCampaigns.interestedContacts.import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}