import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Wait for auth to be fully initialized
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('No authenticated user found');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('Checking admin role for user:', session.user.id);
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      console.log('has_role response:', { data, error });

      if (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
      } else {
        const isAdminUser = data === true;
        setIsAdmin(isAdminUser);
        console.log('Admin status:', isAdminUser);
      }
    } catch (error) {
      console.error('Error in admin check:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, loading, checkAdminAccess };
}
