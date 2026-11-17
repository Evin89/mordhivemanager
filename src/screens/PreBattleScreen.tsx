import { EnemyShape, shapeLabels } from '../lib/enemyShape';
import { prepareSearchPoints } from '../lib/searchPoints';
import { findSoloScenario, soloScenarios, startSolo, battleField } from '../lib/soloScenarios';
import SoloScenarioBriefing from '../components/SoloScenarioBriefing';
import { prepareContacts } from '../lib/battleEncounters';
import BattleExtrasSetup from '../components/BattleExtrasSetup';
import { drawEndeavours } from '../lib/endeavours';
import { assignBehaviours } from '../lib/behaviours';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button, Select, TextField } from '../components/ui';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { useSoloCampaigns } from '../store/soloCampaign';
import { computeWarbandRating, countModels } from '../lib/rating';
import { buildNpcWarband, difficultyForBudget, generateAgenda, TEMPERAMENT_LABELS, TEMPERAMENT_HINTS } from '../lib/npc';
import { budgetForAct, actLabel } from '../lib/soloAgenda';
import { generateBattlefield } from '../lib/battlefield';
import BattlefieldMap from '../components/BattlefieldMap';
import { warbandDefinitionsByName, getWarbandDefinition } from '../data/warbandRegistry';
import { BattleSession, defaultBattleSession, loadBattleSession, saveBattleSession } from '../store/battle';
import scenariosData from '../data/scenarios.json';
import { CONDITIONS, identifyNemesis, operationName, scenarioName, sectorName, theFaction } from '../lib/hiveCampaign';
import { rollHiveEvent } from '../lib/oracle';
import { generateId } from '../lib/id';
import { IntelDraw } from '../components/Phase6Cards';
import { applyIntelAtStart, intelWantsSearch } from '../lib/intel';
import { newClockDeck } from '../lib/clockDeck';

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
  /** Phase 6 matched strength: a factor of your side's rating, or null for a fixed budget. */
  const [matchFactor, setMatchFactor] = useState<number | null>(null);

  const [searchParams] = useSearchParams();
  const { getCampaign } = useSoloCampaigns();
  const campaign = getCampaign(searchParams.get('campaign') ?? undefined);
  // A solo chapter for this warband: muster the nemesis at act strength if the
  // session doesn't already carry an opponent (so a resume doesn't re-roll it).
  const hiveMission = campaign?.kind === 'hive'
    ? campaign.hive?.board.find((mission) => mission.id === campaign.hive?.activeMissionId)
    : undefined;
  const campaignActive = campaign && campaign.warbandId === warbandId && campaign.status === 'active'
    && (campaign.kind !== 'hive' || !!hiveMission);
  const hiveBattleConflict = !!(campaignActive && hiveMission && (session.started || session.postBattleComplete)
    && (session.postBattleComplete || session.soloMission?.campaignId !== campaign?.id
      || session.soloMission?.missionId !== hiveMission.id));
  useEffect(() => {
    if (!campaignActive || !campaign) return;
    if (campaign.kind === 'hive') {
      if (!hiveMission || !campaign.hive || hiveBattleConflict) return;
      if (session.soloMission?.campaignId === campaign.id && session.soloMission.missionId === hiveMission.id) return;
      const def = getWarbandDefinition(campaign.nemesisType);
      if (!def) return;
      const npc = identifyNemesis(buildNpcWarband(def, hiveMission.budget), campaign.hive, hiveMission);
      const agenda = generateAgenda();
      const solo = soloScenarios.find((item) => item.id === hiveMission.scenarioId);
      const next: BattleSession = {
        ...defaultBattleSession(warbandId ?? ''),
        soloMission: { campaignId: campaign.id, missionId: hiveMission.id },
        scenario: solo?.name ?? scenarioName(hiveMission.scenarioId),
        soloScenario: solo ? { id: solo.id, trackers: {}, outcome: null } : null,
        assets: [...(campaign.hive.assets ?? [])],
        clockDeck: hiveMission.stake === 'reckoning' ? newClockDeck() : null,
        npcWarband: npc,
        opponentName: npc.name,
        npcAgenda: agenda,
        alarmEnabled: true,
        alarm: hiveMission.condition === 'on-alert' ? 4 : 0,
        endeavourDraw: hiveMission.condition === 'bounty' ? 'd3' : 'none',
        npcBehaviours: assignBehaviours(npc, agenda),
      };
      setNpcTypeId(def.id);
      setNpcBudget(hiveMission.budget);
      setSession(next);
      saveBattleSession(next);
      return;
    }
    if (session.npcWarband) return;
    const def = getWarbandDefinition(campaign.nemesisType);
    if (!def) return;
    const npc = buildNpcWarband(def, budgetForAct(campaign.act));
    const agenda = generateAgenda();
    const next: BattleSession = {
      ...session,
      npcWarband: npc,
      opponentName: npc.name,
      opponentWarbandId: null,
      npcAgenda: agenda,
      npcAgendaRevealed: false,
      alarmEnabled: true, npcBehaviours: assignBehaviours(npc, agenda), behaviourTicks: {}, npcReinforcements: [],
    };
    setSession(next);
    saveBattleSession(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignActive, campaign?.id, hiveMission?.id]);

  // Matched strength follows your side's rating, allies included.
  const liveSide = warband ? computeWarbandRating(warband) + session.allies.reduce((sum, a) => sum + computeWarbandRating(a.warband), 0) : 0;
  useEffect(() => {
    if (matchFactor !== null) setNpcBudget(Math.max(250, Math.round(liveSide * matchFactor / 25) * 25));
  }, [liveSide, matchFactor]);

  if (!warband) return <Navigate to="/warbands" replace />;
  if (hiveBattleConflict) {
    return (
      <div className="space-y-6">
        <BackHeader title="Pre-Battle" to={`/solo/${campaign?.id}`} />
        <Plate className="p-4 space-y-3">
          <p className="font-body text-ink">
            This warband has another battle or allied post-battle work in progress. Finish it before fighting this mission.
          </p>
          <Button onClick={() => navigate(`/warbands/${warband.id}/${session.postBattleComplete ? 'post-battle' : 'battle'}`)}>
            Return to the current battle
          </Button>
        </Plate>
      </div>
    );
  }

  const otherWarbands = warbands.filter((w) => w.id !== warband.id);
  // Phase 6 matched strength: your warband plus any allies.
  const sideRating = computeWarbandRating(warband) + session.allies.reduce((sum, a) => sum + computeWarbandRating(a.warband), 0);
  const matchedBudget = (factor: number) => Math.max(250, Math.round(sideRating * factor / 25) * 25);
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
    const generated = buildNpcWarband(def, npcBudget, session.enemyShape);
    const npc = campaignActive && campaign?.kind === 'hive' && campaign.hive && hiveMission
      ? identifyNemesis(generated, campaign.hive, hiveMission)
      : generated;
    const agenda = generateAgenda();
    update({
      npcWarband: npc,
      opponentName: npc.name,
      opponentWarbandId: null,
      npcAgenda: agenda,
      npcAgendaRevealed: false,
      alarmEnabled: true, npcBehaviours: assignBehaviours(npc, agenda), behaviourTicks: {}, npcReinforcements: [],
    });
  }

  function clearNpc() {
    update({ intel: null, scenario: findSoloScenario(session.scenario) ? '' : session.scenario, soloScenario: null, searchEnabled: false, searchPoints: [], lead: false, npcWarband: null, npcAgenda: null, npcAgendaRevealed: false, alarmEnabled:false, npcBehaviours:{}, behaviourTicks:{}, npcReinforcements:[], allies:[] });
  }

  function startBattle() {
    if (!warband || hiveBattleConflict) return;
    if (session.soloScenario?.id === 'solo-rescue' && !session.soloScenario.captiveHeroId) return;
    const ashEvent = !session.started && campaignActive && hiveMission?.condition === 'ash-storm'
      ? rollHiveEvent() : null;
    const solo = startSolo(session);
    const prepared = prepareSearchPoints(!session.started && intelWantsSearch(solo) ? { ...solo, searchEnabled: true } : solo);
    const withContacts = { ...prepared, ...prepareContacts(prepared) };
    const ready = session.started ? withContacts : applyIntelAtStart(withContacts);
    update({ ...ready, started: true, turn: session.started ? session.turn : 1,
      events: ashEvent
        ? [{ id: generateId(), turn: 1, text: `Ash Storm — Hive event ${ashEvent.roll}: ${ashEvent.text}` }, ...ready.events]
        : ready.events,
      npcBehaviours: ready.npcWarband ? { ...assignBehaviours(ready.npcWarband, ready.npcAgenda), ...session.npcBehaviours } : {},
      endeavours: session.started ? session.endeavours : drawEndeavours(session.endeavourDraw),
      allies: session.allies.map(a => ({...a, endeavours: session.started ? a.endeavours : drawEndeavours(session.endeavourDraw)})),
    });
    navigate(`/warbands/${warband.id}/battle`, { replace: true });
  }

  return (
    <div>
      <BackHeader title="Pre-Battle" to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        {campaignActive && campaign && (
          <Plate className="p-3">
            <p className="font-display uppercase tracking-[0.05em] text-ink text-sm">
              {campaign.name} · {hiveMission
                ? `${sectorName(hiveMission.sector)} · ${hiveMission.operation ? `${operationName(hiveMission.operation.id)} ${hiveMission.operation.step}/2` : hiveMission.stake === 'reckoning' ? 'Reckoning' : hiveMission.stake === 'defence' ? 'Defence' : 'Raid'} · ${CONDITIONS[hiveMission.condition].name}`
                : `${actLabel(campaign.act)} · Chapter ${campaign.chapter}`}
            </p>
            <p className="font-body text-ink-faded text-sm">
              {hiveMission
                ? 'App-original · Not part of the ruleset. Apply & finish in post-battle resolves this mission automatically.'
                : `${theFaction(campaign.nemesisName, true)} return in force. Record the outcome back on the campaign page afterwards.`}
            </p>
          </Plate>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="font-display uppercase tracking-[0.05em] text-ink text-lg">{warband.name}</p>
          <PageChip>Rating {computeWarbandRating(warband)}</PageChip>
        </div>

        {/* Scenario */}
        <section className="space-y-2">
          <BannerHeader>Scenario</BannerHeader>
          <div className="pt-2 space-y-2">
            <Select value={session.scenario} onChange={(e) => { setRoll(null); update({ scenario: e.target.value, soloScenario: findSoloScenario(e.target.value) ? { id: findSoloScenario(e.target.value)!.id, trackers: {}, outcome: null } : null }); }}>
              <option value="">Choose a scenario…</option>
              {scenariosData.scenarios.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
              {session.npcWarband && (!campaignActive || findSoloScenario(session.scenario)) && <optgroup label="Solo scenarios (app-original)">
                {soloScenarios.filter(s => s.id !== 'solo-rescue' || warband.heroes.some(h => !h.isLeader)).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </optgroup>}
            </Select>
            <SoloScenarioBriefing name={session.scenario} />
            {session.soloScenario?.id === 'solo-rescue' && <label className="block">Captive
              <Select value={session.soloScenario.captiveHeroId ?? ''} onChange={e => update({ soloScenario: { ...session.soloScenario!, captiveHeroId: e.target.value } })}>
                <option value="">Choose a captive…</option>
                {warband.heroes.filter(h => !h.isLeader).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            </label>}
            <Button size="dense" variant="secondary" fullWidth={false} onClick={rollScenario}>
              Roll 2D6 for scenario
            </Button>
            {roll && <p className="font-body text-ink-faded text-sm">{roll}</p>}
            {scenario && (
              <Plate className="p-3 mt-2">
                <Link className="inline-flex items-center min-h-[44px] underline" to={`/scenarios?s=${scenario.id}&seed=${session.battlefieldSeed ?? 0}`}>Open in scenario generator</Link>
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
        {(scenario || findSoloScenario(session.scenario)) && (
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
                    <BattlefieldMap field={findSoloScenario(session.scenario) ? battleField(session) : generateBattlefield(session.battlefieldSeed, scenario?.id ?? '')} />
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

        {session.npcWarband && <label className="flex items-center gap-3 min-h-[44px]">
          <input type="checkbox" checked={session.searchEnabled} onChange={e => update({ searchEnabled: e.target.checked, searchPoints: [], lead: false })}/>
          Search points · App-original · Not part of the ruleset
        </label>}
        {/* Solo: AI opponent */}
        <section className="space-y-2">
          <BannerHeader>Solo — AI Opponent</BannerHeader>
          <div className="pt-2 space-y-2">
            <p className="font-body text-ink-faded text-xs">
              Playing alone? Generate an app-built enemy warband to fight. Its roster is drawn from the
              sourced lists; its behaviour is an app-original assistant, not part of the ruleset.
            </p>
            <label className="block font-ui">Shape
              <Select disabled={!!campaignActive} value={session.enemyShape} onChange={e => update({ enemyShape: e.target.value as EnemyShape })}>
                {Object.entries(shapeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </label>
            <p className="font-body text-ink-faded text-xs">Difficulty: {difficultyForBudget(npcBudget)} · {shapeLabels[session.enemyShape]}{matchFactor !== null && ` · Your side: ${sideRating} · enemy budget ${npcBudget} tn`}</p>
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
                  <label className="font-ui">Budget<TextField type="number" min={0} value={npcBudget} onChange={e=>setNpcBudget(Math.max(0,Number(e.target.value)||0))}/></label><Button size="dense" variant="secondary" fullWidth={false} onClick={generateNpc}>Re-roll</Button>
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
                  <Select value={matchFactor !== null ? `match-${matchFactor}` : String(npcBudget)} onChange={(e) => {
                    const value = e.target.value;
                    if (value.startsWith('match-')) {
                      const factor = Number(value.slice(6));
                      setMatchFactor(factor);
                      setNpcBudget(matchedBudget(factor));
                    } else {
                      setMatchFactor(null);
                      setNpcBudget(parseInt(value, 10));
                    }
                  }}>
                    <option value="350">Skirmish (350 tn)</option>
                    <option value="500">Even (500 tn)</option>
                    <option value="650">Overwhelming (650 tn)</option>
                    {matchFactor === null && ![350,500,650].includes(npcBudget) && <option value={String(npcBudget)}>Combined strength ({npcBudget} tn)</option>}
                    <option value="match-1">Match my side ×1 ({matchedBudget(1)} tn)</option>
                    <option value="match-1.25">Hard ×1.25 ({matchedBudget(1.25)} tn)</option>
                    <option value="match-1.5">Brutal ×1.5 ({matchedBudget(1.5)} tn)</option>
                  </Select>
                </label>
                <Button size="dense" fullWidth={false} onClick={generateNpc}>Generate</Button>
              </div>
            )}
          </div>
        </section>

        {session.npcWarband && <IntelDraw session={session} update={next => update(next)} />}
        <BattleExtrasSetup session={session} own={warbands} update={update} onAlliesChanged={count => { if (matchFactor === null) setNpcBudget(500 * (count + 1)); }} />
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

        <Button onClick={startBattle} disabled={!session.scenario || hiveBattleConflict || (session.soloScenario?.id === 'solo-rescue' && !session.soloScenario.captiveHeroId)}>
          {session.started ? 'Resume battle' : 'Start battle'}
        </Button>
        {!session.scenario && <p className="font-body text-ink-faded text-sm">Pick a scenario to begin.</p>}
      </div>
    </div>
  );
}
