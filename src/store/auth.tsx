import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Session state for the whole app. `loading` is true until Supabase has read any
// stored session, so guarded routes don't flash the sign-in screen on reload.
type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True after arriving from a password-reset link, until the new password is set. */
  recovering: boolean;
  /** Mord Hive's own display name (mordhive.profiles), not Mordheim Manager's. */
  displayName: string;
  setDisplayName: (name: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

/** A first name for a brand-new profile: the part of the email before the @. */
function defaultName(email: string | undefined): string {
  return (email ?? '').split('@')[0].slice(0, 40);
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [displayName, setName] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Load (or create, on first sign-in) the Mord Hive profile.
  const userId = session?.user.id;
  const email = session?.user.email;
  useEffect(() => {
    setName('');
    if (!userId) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
      if (!active) return;
      if (data) {
        setName(data.display_name);
        return;
      }
      const name = defaultName(email);
      const { error } = await supabase.from('profiles').insert({ id: userId, display_name: name });
      if (active && !error) setName(name);
    })();
    return () => {
      active = false;
    };
  }, [userId, email]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      recovering,
      displayName,
      setDisplayName: async (name: string) => {
        if (!userId) return 'Not signed in.';
        const clean = name.trim().slice(0, 40);
        const { error } = await supabase.from('profiles').upsert({ id: userId, display_name: clean });
        if (error) return error.message;
        setName(clean);
        return null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, recovering, displayName, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
