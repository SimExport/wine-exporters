import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TallyCsvImporter } from '@/components/admin/TallyCsvImporter';
import { TenderPdfImporter } from '@/components/admin/TenderPdfImporter';
import { ImporterRequestsList } from '@/components/admin/ImporterRequestsList';
import { TenderRequestsList } from '@/components/admin/TenderRequestsList';
import { ImporterRequestCreateDialog } from '@/components/admin/ImporterRequestCreateDialog';
import { ImporterSubmissionsQueue } from '@/components/admin/ImporterSubmissionsQueue';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type NotificationOperation = {
  id: string; status: 'active' | 'completed'; blocked: boolean;
  total: number; accepted: number; remaining: number; failed: number; indeterminate: number;
};

export default function AdminOpportunities() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [operation, setOperation] = useState<NotificationOperation | null>(null);
  const [trackingReady, setTrackingReady] = useState(false);
  const [trackingError, setTrackingError] = useState(false);

  const readTracking = async () => {
    setTrackingReady(false);
    try {
      const { data, error } = await supabase.functions.invoke('notify-new-opportunities', { body: { action: 'status' } });
      if (error) throw error;
      setOperation(data?.operation ?? null);
      setTrackingError(false);
      setTrackingReady(true);
    } catch {
      setTrackingError(true);
      console.error('Suivi des notifications indisponible.');
    }
  };

  useEffect(() => { void readTracking(); }, []);

  const handleNotify = async () => {
    setSending(true);
    try {
      const body = operation?.status === 'active'
        ? { action: 'resume', operation_id: operation.id }
        : { action: 'create', confirm_new: true };
      const { data, error } = await supabase.functions.invoke('notify-new-opportunities', { body });
      let result = data;
      if (error instanceof FunctionsHttpError) {
        try { result = await error.context.json(); } catch { throw error; }
      } else if (error) {
        throw error;
      }
      if (!result || !('operation' in result)) throw new Error('Suivi indisponible');
      setOperation(result.operation ?? null);
      const current = result.operation as NotificationOperation | null;
      toast({
        title: result.success ? 'Notifications acceptées par Resend' : 'Envoi incomplet',
        description: result.error ?? (current
          ? `${current.accepted} acceptés, ${current.remaining} restants, ${current.failed} en erreur, ${current.indeterminate} à vérifier. Acceptation ≠ livraison.`
          : 'Suivi indisponible. Rechargez avant toute reprise.'),
        variant: result.success ? 'default' : 'destructive',
      });
      if (!current && !result.success) setTrackingReady(false);
    } catch {
      setTrackingReady(false);
      setTrackingError(true);
      toast({ title: 'Suivi interrompu', description: 'Rechargez le suivi avant de reprendre. Aucun lot incertain ne sera relancé automatiquement.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <SEO title="Opportunités — Admin" description="Import et validation des demandes directes et appels d'offres." path="/admin/opportunites" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Opportunités</h1>
          <p className="text-sm text-muted-foreground">Importez les demandes directes (Tally) et les appels d'offres (PDF) à publier aux utilisateurs.</p>
        </div>
        <div className="space-y-2">
        {operation && <p className="text-sm text-muted-foreground" role="status">
          {operation.accepted}/{operation.total} acceptés · {operation.remaining} restants · {operation.failed} erreurs · {operation.indeterminate} à vérifier
        </p>}
        {operation?.blocked && <p className="text-sm text-destructive">Préchargement historique requis avant reprise.</p>}
        {Boolean(operation?.indeterminate) && <p className="text-sm text-destructive">Rapprochement Resend requis : aucune reprise automatique du lot incertain.</p>}
        {trackingError && <p className="text-sm text-destructive">Suivi indisponible.</p>}
        <div className="flex gap-2 flex-wrap">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={sending || !trackingReady || operation?.blocked || Boolean(operation?.indeterminate)} variant="default">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              {operation?.status === 'active' ? "Reprendre l'envoi" : 'Notifier les utilisateurs'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{operation?.status === 'active' ? "Reprendre l'envoi partiel ?" : 'Confirmer un nouvel envoi ?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {operation?.status === 'active'
                  ? 'Seuls les destinataires non acceptés seront repris. Les acceptés ne recevront pas de nouvel envoi.'
                  : 'Un nouveau récapitulatif « Nouvelles opportunités disponibles » sera envoyé aux utilisateurs inscrits. Confirmez uniquement après publication de nouvelles opportunités.'}
                {' '}Une acceptation par Resend ne garantit pas la livraison.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleNotify}>{operation?.status === 'active' ? 'Reprendre' : 'Confirmer et envoyer'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" disabled={sending} onClick={() => void readTracking()}>Actualiser le suivi</Button>
        </div>
        </div>
      </div>
      <Tabs defaultValue="tally" className="w-full">
        <TabsList>
          <TabsTrigger value="tally">Demandes directes (Tally)</TabsTrigger>
          <TabsTrigger value="tender">Appels d'offres (PDF)</TabsTrigger>
        </TabsList>
        <TabsContent value="tally" className="mt-4 space-y-6">
          <ImporterSubmissionsQueue onPublished={() => setRefreshKey((k) => k + 1)} />
          <TallyCsvImporter />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter manuellement
            </Button>
          </div>
          <ImporterRequestsList key={refreshKey} />
          <ImporterRequestCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() => setRefreshKey((k) => k + 1)}
          />
        </TabsContent>
        <TabsContent value="tender" className="mt-4 space-y-6">
          <TenderPdfImporter />
          <TenderRequestsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}