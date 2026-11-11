import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/auth';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import { Button, TextField } from '../components/ui';

/**
 * Landing spot for the password-reset email. Supabase signs the user in from the
 * link (detectSessionInUrl) and fires PASSWORD_RECOVERY; here they pick a new
 * password. Requires https://hive.mordheimmanager.net/reset-password on the
 * project's Auth redirect allow-list.
 */
export default function ResetPasswordScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(err.message);
    else navigate('/warbands', { replace: true });
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <BannerHeader as="h1">New password</BannerHeader>
      <Plate className="p-4 sm:p-6">
        {loading ? (
          <p className="font-body text-ink-faded" role="status">Checking your link…</p>
        ) : !user ? (
          <p className="font-body text-ink text-body-min">
            This reset link has expired or was already used.{' '}
            <Link to="/sign-in" className="underline underline-offset-4">Request a new one</Link>.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="block font-display uppercase tracking-[0.06em] text-sm text-ink mb-1">New password</span>
              <TextField
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p className="font-body text-ink text-body-min border-l-4 border-banner pl-3" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save password'}
            </Button>
          </form>
        )}
      </Plate>
    </div>
  );
}
