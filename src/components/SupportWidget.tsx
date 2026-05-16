import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SupportWidget = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('question');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  if (!user) return null;

  const reset = () => {
    setCategory('question');
    setSubject('');
    setMessage('');
    setSubmitted(false);
  };

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({ user_id: user.id, category, subject: subject.trim(), message: message.trim() })
        .select('id')
        .single();
      if (error) throw error;

      await supabase.functions.invoke('send-support-ticket', {
        body: {
          ticketId: data.id,
          userEmail: user.email,
          category,
          subject: subject.trim(),
          message: message.trim(),
        },
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      toast.error(t('support.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('support.open')}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        <LifeBuoy className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          {submitted ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('support.thanksTitle')}</DialogTitle>
                <DialogDescription>{t('support.thanksBody')}</DialogDescription>
              </DialogHeader>
              <Button onClick={() => handleClose(false)}>{t('common.close')}</Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('support.title')}</DialogTitle>
                <DialogDescription>{t('support.subtitle')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('support.category')}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">{t('support.cat.question')}</SelectItem>
                      <SelectItem value="bug">{t('support.cat.bug')}</SelectItem>
                      <SelectItem value="suggestion">{t('support.cat.suggestion')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('support.subject')}</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('support.message')}</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={5} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? t('common.loading') : t('support.submit')}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};