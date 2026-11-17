import type { BattleSession } from '../store/battle';
import type { Warband } from '../types';
import { findSoloScenario, neededToEscape, trackObjective } from '../lib/soloScenarios';
import { SoloPlate } from './SoloNote';
import { Button } from './ui';

export default function ObjectivePlate({ session: s, warband, update }: {
  session: BattleSession;
  warband: Warband;
  update: (patch: Partial<BattleSession>) => void;
}) {
  const def = findSoloScenario(s.scenario);
  const state = s.soloScenario;
  if (!def || !state) return null;
  const escaped = Number(state.trackers.escaped ?? 0);
  function track(key: string, value: boolean | number) {
    update(trackObjective(s, key, value));
  }
  return (
    <div className="cogitator">
      <SoloPlate>
        <h2 className="font-heading text-3xl">Objective</h2>
        <p>Win: {def.win}</p>
        <p>Lose: {def.lose}</p>
        {def.turnLimit && <p>Turn limit: {def.turnLimit}</p>}
        {def.setup.map(line => <p key={line}>{line}</p>)}
        {def.id === 'solo-break-in' && s.alarm === 0 && <p>The alarm is at 0: the enemy are sentries. Roll for each on its card.</p>}
        {def.id === 'solo-rescue' && <p>Captive: {warband.heroes.find(h => h.id === state.captiveHeroId)?.name}</p>}
        {def.trackers.map(label => (
          <Button key={label} variant="secondary" disabled={!!state.outcome || !!state.trackers[label] || (label === 'Vault opened' && s.turn < 2) || (def.id === 'solo-hold' && s.turn < 8) || (['solo-break-in', 'solo-rescue'].includes(def.id) && label === def.trackers[1] && !state.trackers[def.trackers[0]])} onClick={() => track(label, true)}>
            {state.trackers[label] ? '✓ ' : ''}{label}
          </Button>
        ))}
        {def.id === 'solo-way-out' && <>
          <p>Exit edge: {state.exitEdge}. Models off by the exit: {escaped} / {neededToEscape(warband)} needed</p>
          <Button variant="secondary" disabled={!!state.outcome || escaped === 0} onClick={() => track('escaped', escaped - 1)}>−</Button>
          <Button variant="secondary" disabled={!!state.outcome} onClick={() => track('escaped', escaped + 1)}>+</Button>
        </>}
        {def.id === 'solo-salvage' && <>
          <p>Caches brought out: {Number(state.trackers.brought ?? 0)} / 2 needed</p>
          <Button variant="secondary" disabled={!!state.outcome || !Number(state.trackers.brought ?? 0)} onClick={() => track('brought', Number(state.trackers.brought ?? 0) - 1)}>−</Button>
          <Button variant="secondary" disabled={!!state.outcome || Number(state.trackers.brought ?? 0) >= 4} onClick={() => track('brought', Number(state.trackers.brought ?? 0) + 1)}>+</Button>
        </>}
        {['solo-break-in', 'solo-hold', 'solo-salvage'].includes(def.id) && <Button variant="danger" disabled={!!state.outcome} onClick={() => track('failed', true)}>{def.id === 'solo-hold' ? 'The objective is lost' : def.id === 'solo-salvage' ? 'Two caches are out of reach' : 'Carrier taken out'}</Button>}
        <Button variant="danger" disabled={!!state.outcome} onClick={() => track('routed', true)}>We routed</Button>
        {state.outcome && <p role="status">{state.outcome === 'won' ? 'Objective achieved' : 'Objective failed'}</p>}
      </SoloPlate>
    </div>
  );
}
