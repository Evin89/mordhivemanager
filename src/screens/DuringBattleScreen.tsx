import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import ProfileBlock from '../components/ProfileBlock';
import { Button, TextField } from '../components/ui';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { generateId } from '../lib/id';
import { isInWarband } from '../lib/rating';
import { suggestNpcAction, TEMPERAMENT_LABELS, TEMPERAMENT_HINTS } from '../lib/npc';
import { generateBattlefield } from '../lib/battlefield';
import BattlefieldMap from '../components/BattlefieldMap';
import Oracle from '../components/Oracle';
import scenariosData from '../data/scenarios.json';
import {
  BattleSession,
  defaultBattleSession,
  loadBattleSession,
  saveBattleSession,
} from '../store/battle';

/** The live battle tracker (spec §5): a turn counter, a timestamped event log,
 * and a casualty tally recorded as it happens — which seeds the post-battle
 * Injuries step. Persists through a reload. */
export default function DuringBattleScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const navigate = useNavigate();
  const warband = useWarbandLookup(warbandId);
  const { warbands } = useWarbands();

  const [session, setSession] = useState<BattleSession>(
    () => loadBattleSession(warbandId ?? '') ?? defaultBattleSession(warbandId ?? ''),
  );
  const [eventText, setEventText] = useState('');
  const [rosterOpen, setRosterOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(true);
  const [oracleOpen, setOracleOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  if (!warband) return <Navigate to="/warbands" replace />;
  if (!session.started) return <Navigate to={`/warbands/${warband.id}/pre-battle`} replace />;

  const opponent = session.opponentWarbandId ? warbands.find((w) => w.id === session.opponentWarbandId) : undefined;
  const activeHeroes = warband.heroes.filter((h) => isInWarband(h.status));

  function update(patch: Partial<BattleSession>) {
    const next = { ...session, ...patch };
    setSession(next);
    saveBattleSession(next);
  }

  function logEvent(text: string) {
    if (!text.trim()) return;
    update({ events: [{ id: generateId(), turn: session.turn, text: text.trim() }, ...session.events] });
    setEventText('');
  }

  function stepTurn(delta: number) {
    if (delta < 0) {
      if (!window.confirm('Step the turn counter back?')) return;
    }
    update({ turn: Math.max(1, session.turn + delta) });
  }

  function toggleHero(id: string) {
    const set = new Set(session.outOfAction.heroIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    update({ outOfAction: { ...session.outOfAction, heroIds: [...set] } });
  }

  function setHenchCount(groupId: string, n: number) {
    update({
      outOfAction: {
        ...session.outOfAction,
        henchmenCounts: { ...session.outOfAction.henchmenCounts, [groupId]: n },
      },
    });
  }

  function toggleNpcHero(id: string) {
    const set = new Set(session.npcOutOfAction.heroIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    update({ npcOutOfAction: { ...session.npcOutOfAction, heroIds: [...set] } });
  }

  function setNpcHenchCount(groupId: string, n: number) {
    update({
      npcOutOfAction: {
        ...session.npcOutOfAction,
        henchmenCounts: { ...session.npcOutOfAction.henchmenCounts, [groupId]: n },
      },
    });
  }

  function endBattle() {
    if (!warband) return;
    if (window.confirm('Finish the battle and run the post-battle sequence?')) {
      navigate(`/warbands/${warband.id}/post-battle`);
    }
  }

  const totalOoa =
    session.outOfAction.heroIds.length +
    Object.values(session.outOfAction.henchmenCounts).reduce((s, n) => s + n, 0);

  return (
    <div>
      <BackHeader title="Battle" to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        {/* Turn + summary */}
        <Plate className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display uppercase tracking-[0.05em] text-ink text-lg">{session.scenario || 'Battle'}</p>
              <p className="font-body text-ink-faded text-sm">
                vs {session.opponentName || 'opponent'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="dense" variant="secondary" fullWidth={false} onClick={() => stepTurn(-1)} aria-label="Previous turn">−</Button>
              <PageChip>Turn {session.turn}</PageChip>
              <Button size="dense" variant="secondary" fullWidth={false} onClick={() => stepTurn(1)} aria-label="Next turn">+</Button>
            </div>
          </div>
        </Plate>

        {/* Casualties */}
        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{totalOoa} OOA</PageChip>}>
            Casualties
          </BannerHeader>
          <Plate className="p-3 space-y-3">
            <div>
              <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs mb-1">Heroes</p>
              {activeHeroes.length === 0 ? (
                <p className="font-body text-ink-faded text-sm">No heroes.</p>
              ) : (
                <ul className="space-y-1">
                  {activeHeroes.map((h) => {
                    const down = session.outOfAction.heroIds.includes(h.id);
                    return (
                      <li key={h.id} className="flex items-center justify-between gap-2">
                        <span className={`font-body text-body-min ${down ? 'text-ink-faded line-through' : 'text-ink'}`}>
                          {h.name} <span className="text-xs text-ink-faded">({h.unitType})</span>
                        </span>
                        <Button
                          size="dense"
                          variant={down ? 'primary' : 'secondary'}
                          fullWidth={false}
                          onClick={() => toggleHero(h.id)}
                        >
                          {down ? 'Out of action' : 'Mark OOA'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {warband.henchmenGroups.length > 0 && (
              <div>
                <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs mb-1">Henchmen groups</p>
                <ul className="space-y-1">
                  {warband.henchmenGroups.map((g) => {
                    const n = session.outOfAction.henchmenCounts[g.id] ?? 0;
                    return (
                      <li key={g.id} className="flex items-center justify-between gap-2">
                        <span className="font-body text-ink text-body-min">
                          {g.groupName} <span className="text-xs text-ink-faded">({g.count})</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setHenchCount(g.id, Math.max(0, n - 1))} aria-label="One fewer down">−</Button>
                          <span className="font-display tabular-nums text-ink w-6 text-center">{n}</span>
                          <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setHenchCount(g.id, Math.min(g.count, n + 1))} aria-label="One more down">+</Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Plate>
        </section>

        {/* Enemy (AI opponent) */}
        {session.npcWarband && (
          <section className="space-y-3">
            <BannerHeader
              trailing={
                <button
                  onClick={() => setAiOpen((o) => !o)}
                  className="font-display uppercase tracking-[0.06em] text-on-banner text-xs min-h-[32px] px-2"
                >
                  {aiOpen ? 'Hide AI' : 'Show AI'}
                </button>
              }
            >
              Enemy — {session.npcWarband.name}
            </BannerHeader>
            <p className="font-body text-ink-faded text-xs px-1">
              AI activation is an app-original assistant, not part of the Mord Hive ruleset — treat it as a suggestion.
              {session.npcAgenda && (
                <> Temperament: <span className="text-ink">{TEMPERAMENT_LABELS[session.npcAgenda.temperament]}</span> — {TEMPERAMENT_HINTS[session.npcAgenda.temperament]}</>
              )}
            </p>
            {session.npcAgenda && (
              <Plate className="p-3">
                <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Hidden Agenda</p>
                {session.npcAgendaRevealed ? (
                  <p className="font-body text-ink text-body-min mt-1">
                    <span className="font-display uppercase tracking-[0.04em]">{session.npcAgenda.objective}</span> — {session.npcAgenda.reveal}
                  </p>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-body text-ink-faded text-sm">The enemy fights to its own secret objective.</span>
                    <Button size="dense" variant="secondary" fullWidth={false} onClick={() => update({ npcAgendaRevealed: true })}>
                      Reveal
                    </Button>
                  </div>
                )}
              </Plate>
            )}
            <Plate className="p-3 space-y-3">
              {/* Enemy heroes */}
              <ul className="space-y-2">
                {session.npcWarband.heroes.map((h) => {
                  const down = session.npcOutOfAction.heroIds.includes(h.id);
                  return (
                    <li key={h.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-body text-body-min ${down ? 'text-ink-faded line-through' : 'text-ink'}`}>
                          {h.unitType}{h.isLeader ? ' · Leader' : ''}
                        </span>
                        <Button size="dense" variant={down ? 'primary' : 'secondary'} fullWidth={false} onClick={() => toggleNpcHero(h.id)}>
                          {down ? 'Out of action' : 'Mark OOA'}
                        </Button>
                      </div>
                      {aiOpen && !down && (
                        <p className="font-body text-ink-faded text-xs pl-1">
                          ▸ {suggestNpcAction({ name: h.name, unitType: h.unitType, isLeader: h.isLeader, isAnimal: false, stats: h.stats }, session.turn, session.npcAgenda?.temperament)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {/* Enemy henchmen groups */}
              {session.npcWarband.henchmenGroups.length > 0 && (
                <ul className="space-y-2 border-t border-steel-l pt-3">
                  {session.npcWarband.henchmenGroups.map((g) => {
                    const n = session.npcOutOfAction.henchmenCounts[g.id] ?? 0;
                    const wiped = n >= g.count;
                    return (
                      <li key={g.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-body text-body-min ${wiped ? 'text-ink-faded line-through' : 'text-ink'}`}>
                            {g.count}x {g.unitType}
                          </span>
                          <span className="flex items-center gap-2">
                            <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setNpcHenchCount(g.id, Math.max(0, n - 1))} aria-label="One fewer down">−</Button>
                            <span className="font-display tabular-nums text-ink w-6 text-center">{n}</span>
                            <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setNpcHenchCount(g.id, Math.min(g.count, n + 1))} aria-label="One more down">+</Button>
                          </span>
                        </div>
                        {aiOpen && !wiped && (
                          <p className="font-body text-ink-faded text-xs pl-1">
                            ▸ {suggestNpcAction({ name: g.groupName, unitType: g.unitType, isLeader: false, isAnimal: g.isAnimal, stats: g.stats }, session.turn, session.npcAgenda?.temperament)}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Plate>
          </section>
        )}

        {/* Battlefield map */}
        {session.battlefieldSeed !== null && (
          <section className="space-y-3">
            <BannerHeader>Battlefield</BannerHeader>
            <Button variant="secondary" onClick={() => setMapOpen((o) => !o)}>
              {mapOpen ? 'Hide map' : 'Show map'}
            </Button>
            {mapOpen && (
              <Plate className="p-3">
                <BattlefieldMap
                  field={generateBattlefield(
                    session.battlefieldSeed,
                    scenariosData.scenarios.find((s) => s.name === session.scenario)?.id ?? '',
                  )}
                />
              </Plate>
            )}
          </section>
        )}

        {/* Oracle (solo) */}
        <section className="space-y-3">
          <BannerHeader>Oracle</BannerHeader>
          <Button variant="secondary" onClick={() => setOracleOpen((o) => !o)}>
            {oracleOpen ? 'Hide the Oracle' : 'Consult the Oracle'}
          </Button>
          {oracleOpen && <Oracle onLog={(text) => logEvent(text)} />}
        </section>

        {/* Event log */}
        <section className="space-y-3">
          <BannerHeader>Event Log</BannerHeader>
          <div className="flex gap-2">
            <TextField
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') logEvent(eventText); }}
              placeholder="e.g. Vael downed the Ork Boss"
            />
            <Button fullWidth={false} onClick={() => logEvent(eventText)}>Log</Button>
          </div>
          {session.events.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">No events yet.</p>
          ) : (
            <Plate className="p-3">
              <ul className="space-y-1.5">
                {session.events.map((ev) => (
                  <li key={ev.id} className="flex items-start justify-between gap-2">
                    <span className="font-body text-ink text-body-min">
                      <span className="font-display text-ink-faded text-xs mr-2">T{ev.turn}</span>
                      {ev.text}
                    </span>
                    <button
                      onClick={() => update({ events: session.events.filter((e) => e.id !== ev.id) })}
                      className="text-ink-faded text-xs shrink-0 min-h-[32px] px-1"
                      aria-label="Delete event"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </Plate>
          )}
        </section>

        {/* Read-only roster reference */}
        <section className="space-y-3">
          <BannerHeader>Roster Reference</BannerHeader>
          <Button variant="secondary" onClick={() => setRosterOpen((o) => !o)}>
            {rosterOpen ? 'Hide roster' : `Show ${warband.name} roster`}
          </Button>
          {rosterOpen && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...warband.heroes.filter((h) => isInWarband(h.status))].map((h) => (
                <Plate key={h.id} className="p-3">
                  <p className="font-display uppercase tracking-[0.04em] text-ink text-sm mb-1">{h.name}</p>
                  <ProfileBlock stats={h.stats} variant="collapsed" />
                  {h.equipment.length > 0 && (
                    <p className="mt-1 font-body text-ink-faded text-xs">{h.equipment.map((e) => e.name).join(', ')}</p>
                  )}
                </Plate>
              ))}
            </div>
          )}
          {opponent && (
            <p className="font-body text-ink-faded text-xs px-1">
              Opponent {opponent.name} is in your warbands — open it in the Warbands tab for its roster.
            </p>
          )}
        </section>

        <Button variant="danger" onClick={endBattle}>Finish battle</Button>
      </div>
    </div>
  );
}
