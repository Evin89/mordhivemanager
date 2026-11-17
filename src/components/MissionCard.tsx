import Plate from './Plate';
import { Button } from './ui';
import { CONDITIONS, HiveMission, operationName, scenarioName, sectorName } from '../lib/hiveCampaign';
import { difficultyForBudget } from '../lib/npc';

type Props = {
  mission: HiveMission;
  leaderName: string;
  active: boolean;
  disabled: boolean;
  threatened?: boolean;
  onTake: () => void;
  onFight: () => void;
  onAbandon: () => void;
};

export default function MissionCard({ mission, leaderName, active, disabled, threatened, onTake, onFight, onAbandon }: Props) {
  const condition = CONDITIONS[mission.condition];

  return (
    <Plate className={`p-4 space-y-3 ${mission.stake === 'reckoning' ? 'border-2 border-[#7A1F1A]' : ''}`}>
      {mission.stake === 'reckoning' && <><h2 className="font-display text-3xl text-ink">The Reckoning</h2><p className="font-body text-ink">Win and it ends here.</p></>}
      <h3 className="font-ui text-brass-text text-lg">{sectorName(mission.sector)} · {mission.stake === 'reckoning' ? 'Reckoning' : mission.stake === 'defence' ? 'Defence' : 'Raid'}</h3>
      {threatened && <p className="font-ui text-ink"><span className="hive-last-seen hive-threat mr-2">Their next move</span> Win here and they are thrown back (+1 clue). Fight elsewhere and they take a step here anyway.</p>}
      {mission.operation && <p className="font-ui text-ink">Operation: {operationName(mission.operation.id)} · part {mission.operation.step} of 2{mission.operation.step === 1 ? '. Win both parts and choose an asset.' : '. Take another mission and the operation is dropped.'}</p>}
      <p className="font-body text-ink">{scenarioName(mission.scenarioId)}</p>
      <p className="font-ui text-ink">{condition.name}</p>
      <p className="font-body text-ink-faded text-sm">{condition.line.replace('{Leader name}', leaderName)}</p>
      <p className="font-mono text-ink">{mission.budget} tn · {difficultyForBudget(mission.budget)}</p>
      {mission.stake === 'defence' && !threatened && <p className="font-body text-ink-faded text-sm">Ignoring this defence costs 1 control here.</p>}
      {active ? (
        <div className="space-y-2">
          <Button disabled={disabled} onClick={onFight}>Fight this battle</Button>
          <Button variant="danger" disabled={disabled} onClick={onAbandon}>Give up this mission</Button>
        </div>
      ) : <Button disabled={disabled} onClick={onTake}>Take this mission</Button>}
    </Plate>
  );
}
