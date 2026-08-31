import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button, Select, TextField } from '../components/ui';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { computeWarbandRating, countModels } from '../lib/rating';
import { buildNpcWarband, difficultyForBudget, generateAgenda, TEMPERAMENT_LABELS, TEMPERAMENT_HINTS } from '../lib/npc';
import { generateBattlefield } from '../lib/battlefield';
import BattlefieldMap from '../components/BattlefieldMap';
import { warbandDefinitionsByName } from '../data/warbandRegistry';
import { BattleSession, defaultBattleSession, loadBattleSession, saveBattleSession } from '../store/battle';
import scenariosData from '../data/scenarios.json';

/** Battle setup (spec §5): pick or roll a scenario, note the opponent, jot
 * pre-battle notes, then start the fight. Persists so a refresh doesn't lose it. */
export default function PreBattleScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const navigate = useNavigate();
  const warband = useWarbandLookup(warbandId);
  const { warbands } = useWarbands();

  const [session, setSession] = useState<BattleSession>(
    () => loadBattleSession(warbandId ?? '') ?? defaultBattleSession(warbandId ?? ''),
  );
  const [roll, setRoll] = useState<string | null>(null);
  const [npcTypeId, setNpcTypeId] = useState(warbandDefinitionsByName[0]?.id ?? '');
  const [npcBudget, setNpcBudget] = useState(500);

  if (!warband) return <Navigate to="/warbands" replace />;

  const otherWarbands = warbands.filter((w) => w.id !== warband.id);
  const scenario = scenariosData.scenarios.find((s) => s.name === session.scenario);

  function update(patch: Partial<BattleSession>) {
    const next = { ...session, ...patch };
    setSession(next);
    saveBattleSession(next);
  }

  function rollScenario() {
    const total = 1 + Math.floor(Math.random() * 6) + (1 + Math.floor(Math.random() * 6));
    const row = scenariosData.rollTable.find((r) => r.roll === total);
    if (!row) return;
    if (row.scenario === null) {
      setRoll(`2D6 = ${total}: the lower-rated warband chooses — pick a scenario.`);
      return;
    }
    const found = scenariosData.scenarios.find((s) => s.id === row.scenario);
    if (found) {
      setRoll(`2D6 = ${total}: ${found.name}`);
      update({ scenario: found.name });
    }
  }

  function generateNpc() {
    const def = warbandDefinitionsByName.find((d) => d.id === npcTypeId);
    if (!def) return;
    const npc = buildNpcWarband(def, npcBudget);
    update({
      npcWarband: npc,
      opponentName: npc.name,
      opponentWarbandId: null,
      npcAgenda: generateAgenda(),
      npcAgendaRevealed: false,
    });
  }

  function clearNpc() {
    update({ npcWarband: null, npcAgenda: null, npcAgendaRevealed: false });
  }

  function startBattle() {
    if (!warband) return;
    update({ started: true, turn: 1 });
    navigate(`/warbands/${warband.id}/battle`, { replace: true });
  }

  return (
    <div>
      <BackHeader title="Pre-Battle" to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display uppercase tracking-[0.05em] text-ink text-lg">{warband.name}</p>
          <PageChip>Rating {computeWarbandRating(warband)}</PageChip>
        </div>

        {/* Scenario */}
        <section className="space-y-2">
          <BannerHeader>Scenario</BannerHeader>
          <div className="pt-2 space-y-2">
            <Select value={session.scenario} onChange={(e) => { setRoll(null); update({ scenario: e.target.value }); }}>
              <option value="">Choose a scenario…</option>
              {scenariosData.scenarios.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </Select>
            <Button size="dense" variant="secondary" fullWidth={false} onClick={rollScenario}>
              Roll 2D6 for scenario
            </Button>
            {roll && <p className="font-body text-ink-faded text-sm">{roll}</p>}
            {scenario && (
              <Plate className="p-3 mt-2">
                <p className="font-body text-ink text-body-min leading-relaxed">{scenario.summary}</p>
                <ul className="mt-2 space-y-1">
                  <li className="font-body text-ink-faded text-xs">
                    <span className="font-display uppercase tracking-[0.05em] text-ink">+1 {scenariosData.universalAward.label}</span> — {scenariosData.universalAward.note}
                  </li>
                  {scenario.awards.map((a) => (
                    <li key={a.id} className="font-body text-ink-faded text-xs">
                      <span className="font-display uppercase tracking-[0.05em] text-ink">{a.amount} {a.label}</span> — {a.note}
                    </li>
                  ))}
                </ul>
              </Plate>
            )}
          </div>
        </section>

        {/* Battlefield */}
        {scenario && (
          <section className="space-y-2">
            <BannerHeader>Battlefield</BannerHeader>
            <div className="pt-2 space-y-2">
              {session.battlefieldSeed === null ? (
                <>
                  <p className="font-body text-ink-faded text-xs">
                    Generate a suggested terrain layout for this scenario — a starting point, not a prescribed board.
                  </p>
                  <Button size="dense" fullWidth={false} onClick={() => update({ battlefieldSeed: Math.floor(Math.random() * 1e9) })}>
                    Generate map
                  </Button>
                </>
              ) : (
                <>
                  <Plate className="p-3">
                    <BattlefieldMap field={generateBattlefield(session.battlefieldSeed, scenario.id)} />
                  </Plate>
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="font-body text-ink-faded text-xs flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border border-ink" style={{ background: 'rgb(var(--color-page))' }} /> Ruin
                    </span>
                    <span className="font-body text-ink-faded text-xs flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: 'rgb(var(--color-banner))' }} /> Objective / diamantine
                    </span>
                    <span className="font-body text-ink-faded text-xs flex items-center gap-1">
                      <span className="inline-block w-4 h-2.5" style={{ background: 'rgb(var(--color-steel-l))' }} /> Deployment
                    </span>
                    <Button size="dense" variant="secondary" fullWidth={false} onClick={() => update({ battlefieldSeed: Math.floor(Math.random() * 1e9) })}>
                      Re-roll
                    </Button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Opponent */}
        <section className="space-y-2">
          <BannerHeader>Opponent</BannerHeader>
          <div className="pt-2 space-y-2">
            <TextField
              value={session.opponentName}
              placeholder="Opponent / player name"
              onChange={(e) => update({ opponentName: e.target.value, opponentWarbandId: null })}
            />
            {otherWarbands.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="font-body text-ink-faded text-xs w-full">Or pick one of your warbands:</span>
                {otherWarbands.map((w) => (
                  <Button
                    key={w.id}
                    size="dense"
                    variant={session.opponentWarbandId === w.id ? 'primary' : 'secondary'}
                    fullWidth={false}
                    onClick={() => update({ opponentWarbandId: w.id, opponentName: w.name })}
                  >
                    {w.name} ({computeWarbandRating(w)})
                  </Button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Solo: AI opponent */}
        <section className="space-y-2">
          <BannerHeader>Solo — AI Opponent</BannerHeader>
          <div className="pt-2 space-y-2">
            <p className="font-body text-ink-faded text-xs">
              Playing alone? Generate an app-built enemy warband to fight. Its roster is drawn from the
              sourced lists; its behaviour is an app-original assistant, not part of the ruleset.
            </p>
            {session.npcWarband ? (
              <Plate className="p-3">
                <p className="font-display uppercase tracking-[0.04em] text-ink text-sm">{session.npcWarband.name}</p>
                <p className="font-body text-ink-faded text-sm">
                  {countModels(session.npcWarband)} models · {session.npcWarband.heroes.length} heroes ·{' '}
                  {session.npcWarband.henchmenGroups.reduce((n, g) => n + g.count, 0)} henchmen · rating{' '}
                  {computeWarbandRating(session.npcWarband)}
                </p>
                {session.npcAgenda && (
                  <p className="font-body text-ink-faded text-xs mt-1">
                    Temperament: <span className="text-ink">{TEMPERAMENT_LABELS[session.npcAgenda.temperament]}</span> — {TEMPERAMENT_HINTS[session.npcAgenda.temperament]} Its objective stays hidden until the battle ends.
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button size="dense" variant="secondary" fullWidth={false} onClick={generateNpc}>Re-roll</Button>
                  <Button size="dense" variant="secondary" fullWidth={false} onClick={clearNpc}>Remove</Button>
                </div>
              </Plate>
            ) : (
              <div className="flex flex-wrap gap-2 items-end">
                <label className="block flex-1 min-w-[10rem]">
                  <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Enemy warband</span>
                  <Select value={npcTypeId} onChange={(e) => setNpcTypeId(e.target.value)}>
                    {warbandDefinitionsByName.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Strength</span>
                  <Select value={npcBudget} onChange={(e) => setNpcBudget(parseInt(e.target.value, 10))}>
                    <option value={350}>Skirmish (350 tn)</option>
                    <option value={500}>Even (500 tn)</option>
                    <option value={650}>Overwhelming (650 tn)</option>
                  </Select>
                </label>
                <Button size="dense" fullWidth={false} onClick={generateNpc}>Generate</Button>
              </div>
            )}
            {!session.npcWarband && (
              <p className="font-body text-ink-faded text-xs">Difficulty: {difficultyForBudget(npcBudget)}</p>
            )}
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <BannerHeader>Pre-Battle Notes</BannerHeader>
          <Plate className="p-2 mt-2">
            <textarea
              value={session.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              className="w-full bg-plate px-3 py-2 text-ink font-body focus:outline-none resize-y"
              placeholder="Terrain, special rules, the stakes…"
            />
          </Plate>
        </section>

        <Button onClick={startBattle} disabled={!session.scenario}>
          {session.started ? 'Resume battle' : 'Start battle'}
        </Button>
        {!session.scenario && <p className="font-body text-ink-faded text-sm">Pick a scenario to begin.</p>}
      </div>
    </div>
  );
}
