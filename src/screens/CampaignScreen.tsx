import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useWarbands } from '../store/warbands';
import { getWarbandTypeName } from '../data/warbandRegistry';
import scenarioData from '../data/scenarios.json';
import {
  BattleParticipant,
  CampaignBattle,
  CampaignDetail,
  CampaignMember,
  CampaignWarband,
  deleteBattle,
  leaveCampaign,
  linkWarband,
  loadCampaign,
  logBattle,
  regenerateJoinCode,
  removeMember,
  renameCampaign,
  tally,
} from '../lib/campaigns';
import { BattleResult } from '../types';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button, Select, TextField } from '../components/ui';

const label = 'block font-display uppercase tracking-[0.06em] text-sm text-ink mb-1';
const SCENARIOS = (scenarioData.scenarios as { id: string; name: string }[]).map((s) => ({ id: s.id, name: s.name }));
const scenarioName = (id: string) => SCENARIOS.find((s) => s.id === id)?.name ?? (id || 'Unknown scenario');
const RESULTS: BattleResult[] = ['win', 'draw', 'loss'];
const today = () => new Date().toISOString().slice(0, 10);

function ErrorLine({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p className="font-body text-ink border-l-4 border-banner pl-3" role="alert">
      {children}
    </p>
  );
}

/**
 * One campaign: join code, standings, who's in it, linking your warband, and
 * the shared battle log. Mirrors Mordheim Manager's campaign screen, smaller:
 * no territories, awards or events yet.
 */
export default function CampaignScreen() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const { warbands: myWarbands } = useWarbands();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [warbands, setWarbands] = useState<CampaignWarband[]>([]);
  const [battles, setBattles] = useState<CampaignBattle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    if (!campaignId || !user) return;
    const res = await loadCampaign(campaignId, user.id);
    setCampaign(res.campaign);
    setMembers(res.members);
    setWarbands(res.warbands);
    setBattles(res.battles);
    setError(res.error);
    setLoaded(true);
  }, [campaignId, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isLeader = campaign?.myRole === 'leader';
  const record = useMemo(() => tally(battles), [battles]);
  const standings = useMemo(() => [...warbands].sort((a, b) => b.rating - a.rating), [warbands]);
  const nameOf = (userId: string) => members.find((m) => m.userId === userId)?.displayName ?? 'Former player';
  const linkedIds = new Set(warbands.map((w) => w.id));
  const linkable = myWarbands.filter((w) => !linkedIds.has(w.id));

  // --- link warband
  const [toLink, setToLink] = useState('');
  async function onLink() {
    if (!campaign || !toLink) return;
    const err = await linkWarband(toLink, campaign.id);
    setError(err);
    setToLink('');
    void reload();
  }

  // --- log a battle
  const [showLog, setShowLog] = useState(false);
  const [playedOn, setPlayedOn] = useState(today());
  const [scenario, setScenario] = useState(SCENARIOS[0]?.id ?? '');
  const [results, setResults] = useState<Record<string, BattleResult | ''>>({});
  const [notes, setNotes] = useState('');
  const [logBusy, setLogBusy] = useState(false);
  const participants: BattleParticipant[] = warbands
    .filter((w) => results[w.id])
    .map((w) => ({ warbandId: w.id, name: w.name, result: results[w.id] as BattleResult }));

  async function onLogBattle(e: FormEvent) {
    e.preventDefault();
    if (!campaign || participants.length < 2) return;
    setLogBusy(true);
    const err = await logBattle(campaign.id, { playedOn, scenario, participants, notes: notes.trim() });
    setLogBusy(false);
    setError(err);
    if (!err) {
      setShowLog(false);
      setResults({});
      setNotes('');
      setPlayedOn(today());
      void reload();
    }
  }

  // --- leader tools
  const [rename, setRename] = useState<string | null>(null);

  if (!loaded) {
    return <p className="font-body text-ink-faded py-6" role="status">Loading campaign…</p>;
  }
  if (!campaign) {
    return (
      <div className="space-y-4">
        <BackHeader title="Campaign" to="/campaigns" />
        <ErrorLine>{error ?? "This campaign doesn't exist, or you're not in it."}</ErrorLine>
      </div>
    );
  }

  const shareText = `Join my Mord Hive campaign "${campaign.name}" on ${window.location.origin}/campaigns with code ${campaign.joinCode}`;

  return (
    <div>
      <BackHeader title={campaign.name} to="/campaigns" />
      <div className="py-6 space-y-6">
        <ErrorLine>{error}</ErrorLine>

        {/* Join code */}
        <Plate className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className={label}>Join code</span>
              <p className="font-display text-2xl tracking-[0.25em] text-ink tabular-nums">{campaign.joinCode}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="dense"
                variant="secondary"
                fullWidth={false}
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({ text: shareText });
                      return;
                    } catch {
                      /* cancelled — fall through to copy */
                    }
                  }
                  try {
                    await navigator.clipboard.writeText(shareText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    /* clipboard blocked — the code is on screen anyway */
                  }
                }}
              >
                {copied ? 'Copied' : 'Share'}
              </Button>
              {isLeader && (
                <Button
                  size="dense"
                  variant="secondary"
                  fullWidth={false}
                  onClick={async () => {
                    if (!window.confirm('Make a new join code? The old one stops working.')) return;
                    const res = await regenerateJoinCode(campaign.id);
                    setError(res.error);
                    if (res.code) setCampaign({ ...campaign, joinCode: res.code });
                  }}
                >
                  New code
                </Button>
              )}
            </div>
          </div>
        </Plate>

        {/* Standings */}
        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{standings.length}</PageChip>}>
            Standings
          </BannerHeader>
          {standings.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">No warbands linked yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-plate border-2 border-banner text-left">
                <thead>
                  <tr className="bg-banner text-on-banner font-display uppercase tracking-[0.04em] text-sm">
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2">Warband</th>
                    <th className="px-3 py-2 text-right">Rating</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">W-D-L</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((w, i) => {
                    const r = record.get(w.id) ?? { w: 0, d: 0, l: 0 };
                    const mine = w.ownerId === user?.id;
                    return (
                      <tr key={w.id} className="border-t border-ink/35 align-top">
                        <td className="px-3 py-2 font-display tabular-nums text-ink-faded">{i + 1}</td>
                        <td className="px-3 py-2">
                          <span className="font-display uppercase tracking-[0.03em] text-ink block">{w.name}</span>
                          <span className="font-body text-ink-faded text-sm block">
                            {getWarbandTypeName(w.warbandType)} · {nameOf(w.ownerId)}
                          </span>
                          {mine && (
                            <button
                              type="button"
                              className="font-display text-sm underline underline-offset-4 min-h-[44px]"
                              onClick={async () => {
                                setError(await linkWarband(w.id, null));
                                void reload();
                              }}
                            >
                              Unlink
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-display tabular-nums">{w.rating}</td>
                        <td className="px-3 py-2 text-right font-display tabular-nums whitespace-nowrap">
                          {r.w}-{r.d}-{r.l}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {linkable.length > 0 ? (
            <Plate className="p-4">
              <span className={label}>Link one of your warbands</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={toLink} onChange={(e) => setToLink(e.target.value)} aria-label="Warband to link">
                  <option value="">Choose a warband…</option>
                  {linkable.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({getWarbandTypeName(w.warbandType)})
                    </option>
                  ))}
                </Select>
                <Button fullWidth={false} disabled={!toLink} onClick={onLink}>
                  Link
                </Button>
              </div>
              <p className="font-body text-ink-faded text-sm mt-2">
                Linked warbands are readable by everyone in this campaign, even if they're private.
              </p>
            </Plate>
          ) : myWarbands.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">Create a warband first to take part.</p>
          ) : null}
        </section>

        {/* Battle log */}
        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{battles.length}</PageChip>}>
            Battle log
          </BannerHeader>

          {!showLog ? (
            <Button fullWidth={false} disabled={warbands.length < 2} onClick={() => setShowLog(true)}>
              + Log a battle
            </Button>
          ) : (
            <Plate className="p-4">
              <form onSubmit={onLogBattle} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={label}>Date</span>
                    <TextField type="date" value={playedOn} max={today()} onChange={(e) => setPlayedOn(e.target.value)} required />
                  </label>
                  <label className="block">
                    <span className={label}>Scenario</span>
                    <Select value={scenario} onChange={(e) => setScenario(e.target.value)}>
                      {SCENARIOS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                <fieldset className="space-y-2">
                  <legend className={label}>Who played, and how did it go?</legend>
                  {warbands.map((w) => (
                    <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-l pb-2">
                      <span className="font-body text-ink">{w.name}</span>
                      <div className="flex border border-steel" role="group" aria-label={`Result for ${w.name}`}>
                        {(['', ...RESULTS] as const).map((r) => (
                          <button
                            key={r || 'none'}
                            type="button"
                            aria-pressed={(results[w.id] ?? '') === r}
                            onClick={() => setResults({ ...results, [w.id]: r })}
                            className={`min-h-[44px] px-3 font-display uppercase text-sm tracking-[0.04em] ${
                              (results[w.id] ?? '') === r ? 'bg-banner text-on-banner' : 'bg-plate text-ink'
                            }`}
                          >
                            {r === '' ? 'Out' : r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </fieldset>
                <label className="block">
                  <span className={label}>Notes</span>
                  <TextField value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" fullWidth={false} disabled={logBusy || participants.length < 2}>
                    {logBusy ? 'Saving…' : 'Save battle'}
                  </Button>
                  <Button type="button" variant="secondary" fullWidth={false} onClick={() => setShowLog(false)}>
                    Cancel
                  </Button>
                </div>
                {participants.length < 2 && (
                  <p className="font-body text-ink-faded text-sm">Pick a result for at least two warbands.</p>
                )}
              </form>
            </Plate>
          )}

          {battles.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">No battles logged yet.</p>
          ) : (
            <ol className="space-y-3">
              {battles.map((b) => (
                <li key={b.id}>
                  <Plate className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-display uppercase tracking-[0.04em] text-ink">{scenarioName(b.scenario)}</span>
                      <span className="font-display text-ink-faded text-sm tabular-nums">{b.playedOn}</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {b.participants.map((p) => (
                        <li key={p.warbandId} className="flex justify-between gap-3 font-body text-ink">
                          <span>{p.name}</span>
                          <span className="font-display uppercase text-sm tracking-[0.04em]">{p.result}</span>
                        </li>
                      ))}
                    </ul>
                    {b.notes && <p className="font-body text-ink-faded text-sm mt-2">{b.notes}</p>}
                    {(b.reportedBy === user?.id || isLeader) && (
                      <button
                        type="button"
                        className="mt-2 font-display text-sm underline underline-offset-4 min-h-[44px]"
                        onClick={async () => {
                          if (!window.confirm('Remove this battle from the log?')) return;
                          setError(await deleteBattle(b.id));
                          void reload();
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </Plate>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Players */}
        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{members.length}</PageChip>}>
            Players
          </BannerHeader>
          <Plate className="p-4">
            <ul className="divide-y divide-steel-l">
              {members.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-body text-ink">
                    {m.displayName}
                    {m.userId === user?.id && <span className="text-ink-faded"> (you)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {m.role === 'leader' && <PageChip>Leader</PageChip>}
                    {isLeader && m.userId !== user?.id && (
                      <button
                        type="button"
                        className="font-display text-sm underline underline-offset-4 min-h-[44px]"
                        onClick={async () => {
                          if (!window.confirm(`Remove ${m.displayName} from the campaign?`)) return;
                          setError(await removeMember(campaign.id, m.userId));
                          void reload();
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Plate>
        </section>

        {/* Leader tools + leave */}
        <section className="space-y-3">
          {isLeader && (
            <Plate className="p-4">
              {rename === null ? (
                <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setRename(campaign.name)}>
                  Rename campaign
                </Button>
              ) : (
                <form
                  className="flex flex-col sm:flex-row gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const err = await renameCampaign(campaign.id, rename);
                    setError(err);
                    if (!err) {
                      setCampaign({ ...campaign, name: rename.trim() });
                      setRename(null);
                    }
                  }}
                >
                  <TextField value={rename} maxLength={80} onChange={(e) => setRename(e.target.value)} aria-label="Campaign name" required />
                  <Button type="submit" fullWidth={false} disabled={!rename.trim()}>
                    Save
                  </Button>
                </form>
              )}
            </Plate>
          )}
          <Button
            variant="danger"
            fullWidth={false}
            onClick={async () => {
              const last = members.length <= 1;
              const msg = last
                ? `You're the last player. Leaving deletes "${campaign.name}" and its battle log.`
                : isLeader
                  ? `Leave "${campaign.name}"? Leadership passes to the longest-standing player, and your warbands are unlinked.`
                  : `Leave "${campaign.name}"? Your warbands are unlinked.`;
              if (!window.confirm(msg)) return;
              const err = await leaveCampaign(campaign.id);
              if (err) setError(err);
              else navigate('/campaigns', { replace: true });
            }}
          >
            Leave campaign
          </Button>
        </section>
      </div>
    </div>
  );
}
