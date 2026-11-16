import type { BattleSession } from '../store/battle';
import { searchPoint } from '../lib/searchPoints';
import { SoloPlate } from './SoloNote';
import { Button } from './ui';

export default function SearchPoints({ session, update }: {
  session: BattleSession;
  update: (patch: Partial<BattleSession>) => void;
}) {
  if (!session.searchEnabled) return null;
  return (
    <div className="cogitator">
      <SoloPlate>
        <h2 className="font-heading text-3xl">Search points</h2>
        <p>A hero of yours who ends a turn at a point, not in combat, may search it once.</p>
        {session.searchPoints.map(p => (
          <div key={p.n} className="flex items-center justify-between gap-2">
            <p>{p.n}{p.result ? `: ${p.result}` : ''}</p>
            <Button variant="secondary" fullWidth={false} disabled={p.searched} onClick={() => update(searchPoint(session, p.n))}>{p.searched ? 'Searched' : 'Search'}</Button>
          </div>
        ))}
        {session.lead && <p>One lead secured: +1 clue at mission resolution (maximum 8 clues).</p>}
      </SoloPlate>
    </div>
  );
}
