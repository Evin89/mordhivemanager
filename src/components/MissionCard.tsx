import Plate from './Plate';
import { Button } from './ui';
import { CONDITIONS, HiveMission, sectorName } from '../lib/hiveCampaign';
import { difficultyForBudget } from '../lib/npc';
import scenariosData from '../data/scenarios.json';

type Props = {
  mission: HiveMission;
  leaderName: string;
  active: boolean;
  disabled: boolean;
  onTake: () => void;
  onFight: () => void;
  onAbandon: () => void;
};

export default function MissionCard({ mission, leaderName, active, disabled, onTake, onFight, onAbandon }: Props) {
  const condition = CONDITIONS[mission.condition];
  const scenario = scenariosData.scenarios.find((item) => item.id === mission.scenarioId);
  return (
    <Plate className={`p-4 space-y-3 ${mission.stake === 'reckoning' ? 'border-2 border-[#7A1F1A]' : ''}`}>
      {mission.stake === 'reckoning' && <><h2 className="font-display text-3xl text-ink">The Reckoning</h2><p className="font-body text-ink">Win and it ends here.</p></>}
      <h3 className="font-ui text-brass-text text-lg">{sectorName(mission.sector)} · {mission.stake === 'reckoning' ? 'Reckoning' : mission.stake === 'defence' ? 'Defence' : 'Raid'}</h3>
      <p className="font-body text-ink">{scenario?.name}</p>
      <p className="font-ui text-ink">{condition.name}</p>
      <p className="font-body text-ink-faded text-sm">{condition.line.replace('{Leader name}', leaderName)}</p>
      <p className="font-mono text-ink">{mission.budget} tn · {difficultyForBudget(mission.budget)}</p>
      {mission.stake === 'defence' && <p className="font-body text-ink-faded text-sm">Ignoring this defence costs 1 control here.</p>}
      {active ? (
        <div className="space-y-2">
          <Button disabled={disabled} onClick={onFight}>Fight this battle</Button>
          <Button variant="danger" disabled={disabled} onClick={onAbandon}>Give up this mission</Button>
        </div>
      ) : <Button disabled={disabled} onClick={onTake}>Take this mission</Button>}
    </Plate>
  );
}
