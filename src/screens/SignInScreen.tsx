import { FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase, resetRedirectUrl } from '../lib/supabase';
import { useAuth } from '../store/auth';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import DesignerNote from '../components/DesignerNote';
import { Button, TextField } from '../components/ui';

type Mode = 'signIn' | 'signUp' | 'forgot';

const TITLES: Record<Mode, string> = {
  signIn: 'Sign in',
  signUp: 'Create account',
  forgot: 'Reset password',
};

/**
 * Email + password, as in Mordheim Manager. The account is shared with it: the
 * same email and password work in both apps, and either app's reset link works.
 */
export default function SignInScreen() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/warbands';

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signIn') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) setError(err.message === 'Invalid login credentials' ? 'Email or password is not right.' : err.message);
      } else if (mode === 'signUp') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/warbands` },
        });
        if (err) setError(err.message);
        else if (!data.session) setMessage('Check your email to confirm your account, then sign in.');
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectUrl() });
        if (err) setError(err.message);
        else setMessage('If that email has an account, a reset link is on its way.');
      }
    } finally {
      setBusy(false);
    }
  }

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <BannerHeader as="h1">{TITLES[mode]}</BannerHeader>
      <Plate className="p-4 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-display uppercase tracking-[0.06em] text-sm text-ink mb-1">Email</span>
            <TextField
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== 'forgot' && (
            <label className="block">
              <span className="block font-display uppercase tracking-[0.06em] text-sm text-ink mb-1">Password</span>
              <TextField
                type="password"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'signUp' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {error && (
            <p className="font-body text-ink text-body-min border-l-4 border-banner pl-3" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="font-body text-ink text-body-min border-l-4 border-steel pl-3" role="status">
              {message}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'One moment…' : TITLES[mode]}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-2 font-display text-sm">
          {mode !== 'signIn' && (
            <button type="button" className="text-left underline underline-offset-4 min-h-[44px]" onClick={() => switchTo('signIn')}>
              I have an account — sign in
            </button>
          )}
          {mode !== 'signUp' && (
            <button type="button" className="text-left underline underline-offset-4 min-h-[44px]" onClick={() => switchTo('signUp')}>
              New here — create an account
            </button>
          )}
          {mode !== 'forgot' && (
            <button type="button" className="text-left underline underline-offset-4 min-h-[44px]" onClick={() => switchTo('forgot')}>
              Forgot your password?
            </button>
          )}
        </div>
      </Plate>
      <DesignerNote title="One account, two apps">
        Already use Mordheim Manager? Sign in with the same email and password. Your Mord Hive warbands are kept
        separate from your Mordheim ones.
      </DesignerNote>
    </div>
  );
}
