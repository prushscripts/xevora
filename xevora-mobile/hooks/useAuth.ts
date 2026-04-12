import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, getSession } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applySession = async () => {
      const authUser = await getSession();
      if (!cancelled) {
        setUser(authUser);
        setLoading(false);
      }
    };

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      applySession();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }
        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) {
          setLoading(true);
          const authUser = await getSession();
          if (!cancelled) {
            setUser(authUser);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
