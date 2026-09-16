import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface TechSheetDoc {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  language?: string;
  cuvee?: string;
  vintage?: number;
  format?: string;
}

interface Props {
  doc: TechSheetDoc;
  onSave: (id: string, updates: Partial<TechSheetDoc>) => Promise<void> | void;
  onDelete: (id: string, fileUrl: string) => void;
}

export function TechSheetRow({ doc, onSave, onDelete }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(doc.title ?? '');
  const [cuvee, setCuvee] = useState(doc.cuvee ?? '');
  const [vintage, setVintage] = useState(doc.vintage ? String(doc.vintage) : '');
  const [format, setFormat] = useState(doc.format ?? '');
  const [language, setLanguage] = useState(doc.language ?? '');
  const [savedField, setSavedField] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    setOpening(true);
    try {
      const filePath = doc.file_url.split('/documents/')[1];
      if (!filePath) {
        window.open(doc.file_url, '_blank', 'noopener,noreferrer');
        return;
      }
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(decodeURIComponent(filePath), 3600);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Error opening document:', e);
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    if (!savedField) return;
    const id = setTimeout(() => setSavedField(null), 1800);
    return () => clearTimeout(id);
  }, [savedField]);

  const commit = async (field: keyof TechSheetDoc, value: string | number | undefined, current: any) => {
    if (value === current || (value === '' && (current === null || current === undefined))) return;
    await onSave(doc.id, { [field]: value === '' ? null : value } as Partial<TechSheetDoc>);
    setSavedField(field as string);
  };

  const cell = 'border border-border p-2 align-top';

  return (
    <tr>
      <td className={cell}>
        <Input
          value={title}
          placeholder={t('profile.techSheets.placeholders.name')}
          className="w-full min-w-48"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => commit('title', title.trim() || doc.file_name, doc.title)}
        />
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground truncate max-w-40" title={doc.file_name}>
            {doc.file_name}
          </span>
          {savedField === 'title' && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Check className="h-3 w-3" /> {t('profile.techSheets.saved')}
            </span>
          )}
        </div>
      </td>
      <td className={cell}>
        <Input
          value={cuvee}
          placeholder={t('profile.techSheets.placeholders.cuvee')}
          className="w-full"
          onChange={(e) => setCuvee(e.target.value)}
          onBlur={() => commit('cuvee', cuvee, doc.cuvee)}
        />
      </td>
      <td className={cell}>
        <Input
          value={vintage}
          placeholder={t('profile.techSheets.placeholders.vintage')}
          type="number"
          className="w-full"
          onChange={(e) => setVintage(e.target.value)}
          onBlur={() => commit('vintage', vintage ? parseInt(vintage) : '', doc.vintage)}
        />
      </td>
      <td className={cell}>
        <Input
          value={format}
          placeholder={t('profile.techSheets.placeholders.format')}
          className="w-full"
          onChange={(e) => setFormat(e.target.value)}
          onBlur={() => commit('format', format, doc.format)}
        />
      </td>
      <td className={cell}>
        <Input
          value={language}
          placeholder={t('profile.techSheets.placeholders.language')}
          className="w-full"
          onChange={(e) => setLanguage(e.target.value)}
          onBlur={() => commit('language', language, doc.language)}
        />
      </td>
      <td className={cell}>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('profile.techSheets.open')}
            </a>
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(doc.id, doc.file_url)}>
            {t('profile.documents.delete')}
          </Button>
        </div>
      </td>
    </tr>
  );
}
