import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { CampaignSummary, createCampaign, joinCampaign, listMyCampaigns } from '../lib/campaigns';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import DesignerNote from '../components/DesignerNote';
import { Button, TextField } from '../components/ui';

const label = 'block font-display uppercase tracking-[0.06em] text-sm text-ink mb-1';

/** Your campaigns with your gaming group, plus "start one" and "join with a code". */
export default function CampaignsScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listMyCampaigns(user.id).then((res) => {
      if (!active) return;
      setCampaigns(res.data);
      setError(res.error);
    });
    return () => {
      active = false;
    };
  }, [user]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy('create');
    setFormError(null);
    const res = await createCampaign(name);
    setBusy(null);
    if (res.error || !res.id) setFormError(res.error ?? 'Could not create the campaign.');
    else navigate(`/campaigns/${res.id}`);
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setBusy('join');
    setFormError(null);
    const res = await joinCampaign(code);
    setBusy(null);
    if (res.error || !res.id) setFormError(res.error ?? 'Could not join.');
    else navigate(`/campaigns/${res.id}`);
  }

  return (
    <div className="space-y-6">
      <BannerHeader as="h1" trailing={campaigns ? <PageChip>{campaigns.length}</PageChip> : undefined}>
        Campaigns
      </BannerHeader>

      {error && (
        <p className="font-body text-ink border-l-4 border-banner pl-3" role="alert">
          {error}
        </p>
      )}

      {campaigns === null ? (
        <p className="font-body text-ink-faded" role="status">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <Plate className="p-4">
          <p className="font-body text-ink text-body-min">
            No campaigns yet. Start one for your group, or join with the code someone sent you.
          </p>
        </Plate>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link key={c.id} to={`/campaigns/${c.id}`} className="block">
              <Plate className="p-4 hover:bg-page transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display uppercase tracking-[0.04em] text-ink text-lg truncate">{c.name}</h2>
                  <div className="flex gap-2 shrink-0">
                    {c.role === 'leader' && <PageChip>Leader</PageChip>}
                    <PageChip>{c.memberCount} {c.memberCount === 1 ? 'player' : 'players'}</PageChip>
                  </div>
                </div>
              </Plate>
            </Link>
          ))}
        </div>
      )}

      {formError && (
        <p className="font-body text-ink border-l-4 border-banner pl-3" role="alert">
          {formError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="space-y-3">
          <BannerHeader>Join a campaign</BannerHeader>
          <Plate className="p-4">
            <form onSubmit={onJoin} className="space-y-3">
              <label className="block">
                <span className={label}>Join code</span>
                <TextField
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. K7QM3X"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={12}
                  required
                />
              </label>
              <Button type="submit" disabled={busy !== null || code.trim().length < 6}>
                {busy === 'join' ? 'Joining…' : 'Join'}
              </Button>
            </form>
          </Plate>
        </section>

        <section className="space-y-3">
          <BannerHeader>Start a campaign</BannerHeader>
          <Plate className="p-4">
            <form onSubmit={onCreate} className="space-y-3">
              <label className="block">
                <span className={label}>Campaign name</span>
                <TextField value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              </label>
              <Button type="submit" disabled={busy !== null || name.trim().length === 0}>
                {busy === 'create' ? 'Creating…' : 'Create'}
              </Button>
            </form>
          </Plate>
        </section>
      </div>

      <DesignerNote title="How campaigns work">
        Whoever starts a campaign leads it and gets a join code to share, for example in your group chat. Everyone
        links one of their warbands; standings and the battle log are shared, but each warband stays its owner's to
        edit.
      </DesignerNote>
    </div>
  );
}
