import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/auth';
import { useWarbands } from '../store/warbands';
import { useSoloCampaigns } from '../store/soloCampaign';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import DesignerNote from '../components/DesignerNote';
import PageChip from '../components/PageChip';
import { Button, TextField } from '../components/ui';

const label = 'block font-display uppercase tracking-[0.06em] text-sm text-ink mb-1';

function Notice({ tone, children }: { tone: 'error' | 'ok'; children: string }) {
  return (
    <p
      className={`font-body text-ink text-body-min border-l-4 pl-3 ${tone === 'error' ? 'border-banner' : 'border-steel'}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}

/**
 * The signed-in player's account: Mord Hive display name, email, password,
 * sign out, and removing their Mord Hive data. There is no "delete account":
 * the login is shared with Mordheim Manager, and deleting it here would take
 * the player's Mordheim warbands with it.
 */
export default function AccountScreen() {
  const { user, displayName, setDisplayName, signOut } = useAuth();
  const { warbands } = useWarbands();
  const { campaigns } = useSoloCampaigns();
  const navigate = useNavigate();

  const [name, setName] = useState(displayName);
  const [nameMsg, setNameMsg] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  useEffect(() => setName(displayName), [displayName]);

  const [password, setPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState<'name' | 'pw' | 'delete' | null>(null);

  const [confirmText, setConfirmText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const CONFIRM = 'DELETE';

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setBusy('name');
    const err = await setDisplayName(name);
    setBusy(null);
    setNameMsg(err ? { tone: 'error', text: err } : { tone: 'ok', text: 'Name saved.' });
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setBusy('pw');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    if (error) setPwMsg({ tone: 'error', text: error.message });
    else {
      setPassword('');
      setPwMsg({ tone: 'ok', text: 'Password changed — for Mordheim Manager too, since the account is shared.' });
    }
  }

  async function deleteData() {
    setBusy('delete');
    const { error } = await supabase.rpc('delete_my_data');
    setBusy(null);
    if (error) {
      setDeleteMsg(error.message);
      return;
    }
    // Sign out so the in-memory stores drop what they held, then go home.
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <BannerHeader as="h1">Account</BannerHeader>

      <Plate className="p-4 sm:p-6">
        <form onSubmit={saveName} className="space-y-3">
          <label className="block">
            <span className={label}>Name in Mord Hive</span>
            <TextField value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="font-body text-ink-faded text-sm">
            Shown to your campaign-mates and on warbands you make public. Separate from your Mordheim Manager name.
          </p>
          {nameMsg && <Notice tone={nameMsg.tone}>{nameMsg.text}</Notice>}
          <Button type="submit" variant="secondary" fullWidth={false} disabled={busy !== null || name.trim() === displayName}>
            {busy === 'name' ? 'Saving…' : 'Save name'}
          </Button>
        </form>
      </Plate>

      <Plate className="p-4 sm:p-6 space-y-4">
        <div>
          <span className={label}>Email</span>
          <p className="font-body text-ink break-all">{user?.email}</p>
        </div>
        <form onSubmit={savePassword} className="space-y-3">
          <label className="block">
            <span className={label}>New password</span>
            <TextField
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {pwMsg && <Notice tone={pwMsg.tone}>{pwMsg.text}</Notice>}
          <Button type="submit" variant="secondary" fullWidth={false} disabled={busy !== null || password.length < 8}>
            {busy === 'pw' ? 'Saving…' : 'Change password'}
          </Button>
        </form>
        <div className="pt-2 border-t border-steel-l">
          <Button
            variant="secondary"
            fullWidth={false}
            onClick={async () => {
              await signOut();
              navigate('/', { replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </Plate>

      <section className="space-y-3">
        <BannerHeader>Remove my Mord Hive data</BannerHeader>
        <Plate className="p-4 sm:p-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <PageChip>{warbands.length} {warbands.length === 1 ? 'warband' : 'warbands'}</PageChip>
            <PageChip>{campaigns.length} {campaigns.length === 1 ? 'solo campaign' : 'solo campaigns'}</PageChip>
          </div>
          <p className="font-body text-ink text-body-min">
            Deletes every warband and solo campaign you have here, takes you out of your campaigns and removes your
            Mord Hive name. Your login stays, and so does everything in Mordheim Manager. This cannot be undone.
          </p>
          <label className="block">
            <span className={label}>Type {CONFIRM} to confirm</span>
            <TextField value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </label>
          {deleteMsg && <Notice tone="error">{deleteMsg}</Notice>}
          <Button variant="danger" fullWidth={false} disabled={busy !== null || confirmText !== CONFIRM} onClick={deleteData}>
            {busy === 'delete' ? 'Removing…' : 'Remove my Mord Hive data'}
          </Button>
        </Plate>
      </section>

      <DesignerNote title="One login, two apps">
        Your email and password are shared with Mordheim Manager. Change the password here and it changes there too.
        To delete the login itself, use Mordheim Manager's account page.
      </DesignerNote>
    </div>
  );
}
