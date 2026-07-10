import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TallyCsvImporter } from '@/components/admin/TallyCsvImporter';
import { TenderPdfImporter } from '@/components/admin/TenderPdfImporter';
import { ImporterRequestsList } from '@/components/admin/ImporterRequestsList';
import { TenderRequestsList } from '@/components/admin/TenderRequestsList';
import { ImporterRequestCreateDialog } from '@/components/admin/ImporterRequestCreateDialog';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
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

export default function AdminOpportunities() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNotify = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify-new-opportunities');
      console.log('notify-new-opportunities response', { data, error });
      if (error) throw error;
      const errs: string[] = data?.errors ?? [];
      if (errs.length > 0) {
        toast({
          title: 'Envoi partiel',
          description: `${data?.sent ?? 0}/${data?.totalRecipients ?? 0} envoyés. Erreurs: ${errs.slice(0, 2).join(' | ')}`,
          variant: 'destructive',
        });
        return;
      }
      if ((data?.sent ?? 0) === 0) {
        toast({
          title: 'Aucun email envoyé',
          description: 'La fonction a répondu mais 0 destinataire. Vérifiez les logs.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Notifications envoyées',
        description: `${data?.sent ?? 0} email(s) envoyé(s) sur ${data?.totalRecipients ?? 0} destinataire(s).`,
      });
    } catch (e: any) {
      console.error('notify-new-opportunities error', e);
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={sending} variant="default">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Notifier les utilisateurs
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Envoyer la notification ?</AlertDialogTitle>
              <AlertDialogDescription>
                Un email récapitulatif "Nouvelles opportunités disponibles" sera envoyé à tous les utilisateurs inscrits, avec un lien vers la page Opportunités. À n'utiliser qu'après avoir publié un lot d'opportunités.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleNotify}>Envoyer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <Tabs defaultValue="tally" className="w-full">
        <TabsList>
          <TabsTrigger value="tally">Demandes directes (Tally)</TabsTrigger>
          <TabsTrigger value="tender">Appels d'offres (PDF)</TabsTrigger>
        </TabsList>
        <TabsContent value="tally" className="mt-4 space-y-6">
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