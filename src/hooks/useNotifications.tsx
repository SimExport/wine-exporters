import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AppNotification {
  id: string;
  type: 'new_lead' | 'campaign_active';
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  link: string;
}

const STORAGE_KEY = 'app_notifications';

function loadStored(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveStored(notifs: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(loadStored);

  const addNotification = useCallback((notif: Omit<AppNotification, 'read'>) => {
    setNotifications(prev => {
      if (prev.find(n => n.id === notif.id)) return prev;
      const updated = [{ ...notif, read: false }, ...prev].slice(0, 50);
      saveStored(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveStored(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for new leads — no server-side filter (RLS ensures we only get our data via the subsequent query)
    const leadsChannel = supabase
      .channel(`notif-leads-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        async (payload) => {
          const lead = payload.new as {
            id: string;
            company_name?: string;
            first_name?: string;
            last_name?: string;
            campaign_id: string;
            created_at: string;
          };

          // Verify the lead belongs to the current user via their campaign
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('id, name, user_id')
            .eq('id', lead.campaign_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!campaign) return;

          const name =
            lead.company_name ||
            [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
            'Nouvel importateur';

          addNotification({
            id: `lead-${lead.id}`,
            type: 'new_lead',
            title: 'Nouvel importateur trouvé',
            description: `${name} a répondu à la campagne « ${campaign.name} »`,
            created_at: lead.created_at,
            link: '/prospects',
          });
        }
      )
      .subscribe();

    // Listen for campaigns becoming active — filter by user_id server-side
    const campaignsChannel = supabase
      .channel(`notif-campaigns-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldRow = payload.old as { status?: string };
          const newRow = payload.new as {
            id: string;
            name: string;
            status: string;
            updated_at: string;
          };
          // Fire only on transition → active
          if (oldRow.status !== 'active' && newRow.status === 'active') {
            addNotification({
              id: `campaign-active-${newRow.id}`,
              type: 'campaign_active',
              title: 'Campagne activée',
              description: `La campagne « ${newRow.name} » est maintenant en cours d'envoi`,
              created_at: newRow.updated_at,
              link: `/campaigns/${newRow.id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(campaignsChannel);
    };
  }, [user, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAllRead, clearAll, addNotification };
}
