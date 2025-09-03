import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'user';

export const useRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // User has no role assigned, default to 'user'
          setRole('user');
        } else {
          setRole(data.role as AppRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const hasRole = (requiredRole: AppRole): boolean => {
    if (requiredRole === 'admin') {
      return role === 'admin';
    }
    return role !== null;
  };

  const isAdmin = role === 'admin';

  return {
    role,
    loading,
    hasRole,
    isAdmin
  };
};