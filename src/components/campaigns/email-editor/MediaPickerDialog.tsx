import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { EMAIL_IMAGE_TYPES, uploadEmailImage } from '@/lib/media-upload';

export interface PickedImage { id: string; url: string; title: string }

export const MediaPickerDialog = ({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (img: PickedImage) => void }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase.from('media').select('id,title,file_url,type').eq('user_id', user.id).eq('type', 'image').order('created_at', { ascending: false })
      .then(({ data }) => setItems((data ?? []).map((m) => ({ id: m.id, url: m.file_url, title: m.title }))))
      .then(() => setLoading(false), () => setLoading(false));
  }, [open, user]);

  const pick = (img: PickedImage) => { onPick(img); onOpenChange(false); };

  const onFile = async (file?: File) => {
    if (!file || !user) return;
    if (!EMAIL_IMAGE_TYPES.includes(file.type)) { toast({ title: t('emailEditor.picker.unsupported'), variant: 'destructive' }); return; }
    setUploading(true);
    try {
      pick(await uploadEmailImage(user.id, file));
    } catch (e: any) {
      const msg = e?.message === 'too_large' ? t('emailEditor.picker.tooLarge') : e?.message === 'unsupported_type' ? t('emailEditor.picker.unsupported') : (e?.message ?? t('emailEditor.errors.generic'));
      toast({ title: t('emailEditor.errors.title'), description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{t('emailEditor.picker.title')}</DialogTitle></DialogHeader>
        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">{t('emailEditor.picker.library')}</TabsTrigger>
            <TabsTrigger value="upload">{t('emailEditor.picker.upload')}</TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            {loading ? <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : items.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t('emailEditor.picker.empty')}</p>
              : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto">
                  {items.map((m) => (
                    <button key={m.id} type="button" onClick={() => pick(m)} className="group rounded-md border overflow-hidden text-left hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary" aria-label={`${t('emailEditor.picker.choose')} ${m.title}`}>
                      <img src={m.url} alt={m.title} loading="lazy" className="h-28 w-full object-cover" />
                      <p className="px-2 py-1 text-xs truncate">{m.title}</p>
                    </button>
                  ))}
                </div>
              )}
          </TabsContent>
          <TabsContent value="upload" className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('emailEditor.picker.uploadHelp')}</p>
            <input ref={input} type="file" accept={EMAIL_IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button type="button" onClick={() => input.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? t('emailEditor.picker.uploading') : t('emailEditor.picker.upload')}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
