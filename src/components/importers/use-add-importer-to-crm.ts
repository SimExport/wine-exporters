import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { addImporterToCrm, type CrmClient } from '@/components/importers/importer-crm';
import type { ImporterContact } from '@/lib/importer-profile';

export type CrmAddState = 'idle' | 'adding' | 'added';

/**
 * Shared add-to-CRM state for the /importers table and profile sheet: one
 * in-flight request per contact (buttons stay disabled meanwhile) and a
 * shared "already in CRM" state across both surfaces.
 */
export function useAddImporterToCrm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [states, setStates] = useState<Record<string, Exclude<CrmAddState, 'idle'>>>({});

  const clearPending = (id: string) =>
    setStates(prev => {
      const next = { ...prev };
      if (next[id] === 'adding') delete next[id];
      return next;
    });

  const add = useCallback(async (contact: ImporterContact) => {
    if (!user || states[contact.id]) return;
    setStates(prev => ({ ...prev, [contact.id]: 'adding' }));
    try {
      const result = await addImporterToCrm(supabase as unknown as CrmClient, user.id, contact);
      if (result === 'added') {
        setStates(prev => ({ ...prev, [contact.id]: 'added' }));
        toast({ title: t('importerProfile.crmAddedToast') });
      } else if (result === 'duplicate') {
        // Existing lead reused: surface the shared "already in CRM" state.
        setStates(prev => ({ ...prev, [contact.id]: 'added' }));
        toast({ title: t('importerProfile.crmDuplicateToast') });
      } else if (result === 'no-container') {
        clearPending(contact.id);
        toast({
          title: t('common.error'),
          description: t('importerProfile.crmNoContainerToast'),
          variant: 'destructive',
        });
      } else {
        clearPending(contact.id);
        toast({
          title: t('common.error'),
          description: t('importerProfile.crmErrorToast'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('addImporterToCrm failed', error);
      clearPending(contact.id);
      toast({
        title: t('common.error'),
        description: t('importerProfile.crmErrorToast'),
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, states, t, toast]);

  const stateFor = useCallback(
    (contactId: string): CrmAddState => states[contactId] ?? 'idle',
    [states],
  );

  return { add, stateFor };
}
