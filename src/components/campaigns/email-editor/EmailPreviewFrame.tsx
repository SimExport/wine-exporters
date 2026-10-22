import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  html: string | null;
  subject?: string;
  sender?: string;
  stale?: boolean;
  className?: string;
}

/** Shows the server-rendered HTML as-is in a sandboxed iframe (no scripts). */
export const EmailPreviewFrame = ({ html, subject, sender, stale, className }: Props) => {
  const { t } = useTranslation();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const shownSubject = subject?.replace('{{ contact.COMPANY_NAME }}', '[' + t('emailEditor.subjectPrefix') + ']');
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-md border p-0.5">
          <Button type="button" size="sm" variant={device === 'desktop' ? 'secondary' : 'ghost'} className="h-7" onClick={() => setDevice('desktop')}><Monitor className="h-3.5 w-3.5 mr-1" />{t('emailEditor.desktop')}</Button>
          <Button type="button" size="sm" variant={device === 'mobile' ? 'secondary' : 'ghost'} className="h-7" onClick={() => setDevice('mobile')}><Smartphone className="h-3.5 w-3.5 mr-1" />{t('emailEditor.mobile')}</Button>
        </div>
        {stale && <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-enriched-badge text-enriched-badge-foreground">{t('emailEditor.previewStale')}</span>}
      </div>
      {(subject || sender) && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-0.5">
          {sender && <p className="text-muted-foreground truncate">{sender}</p>}
          {shownSubject && <p className="font-medium break-words">{shownSubject}</p>}
        </div>
      )}
      <div className="rounded-md border bg-muted/30 flex justify-center overflow-hidden">
        {html ? (
          <iframe
            title={t('emailEditor.preview')}
            sandbox=""
            srcDoc={html}
            className={cn('bg-background h-[640px] transition-all', device === 'desktop' ? 'w-full' : 'w-[375px] max-w-full')}
          />
        ) : (
          <p className="p-10 text-sm text-muted-foreground text-center">{t('emailEditor.previewEmpty')}</p>
        )}
      </div>
    </div>
  );
};
