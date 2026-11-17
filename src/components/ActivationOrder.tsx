import type { BattleSession } from '../store/battle';
import { SoloPlate } from './SoloNote';

type State = 'charge' | 'sight' | 'none';
const NEXT: Record<State, State> = { none: 'charge', charge: 'sight', sight: 'none' };
const LABEL: Record<State, string> = { charge: 'Can charge', sight: 'Has sight', none: 'Neither' };
const RANK: Record<State, number> = { charge: 0, sight: 1, none: 2 };

/** Phase 6, after ACOLYTE's activation priority: tap what each enemy can do this
 *  turn and the list sorts itself. App-original · Not part of the ruleset. */
export default function ActivationOrder({ session, update }: {
  session: BattleSession;
  update: (patch: Partial<BattleSession>) => void;
}) {
  const npc = session.npcWarband;
  if (!npc) return null;
  const actors = [
    ...npc.heroes.filter(h => !session.npcOutOfAction.heroIds.includes(h.id))
      .map((h, i) => ({ id: h.id, name: h.name, wounds: h.stats.W, leader: h.isLeader, order: i })),
    ...npc.henchmenGroups.filter(g => g.count - (session.npcOutOfAction.henchmenCounts[g.id] ?? 0) > 0)
      .map((g, i) => ({ id: g.id, name: g.groupName, wounds: g.stats.W, leader: false, order: 100 + i })),
    ...session.npcReinforcements.filter(r => !r.outOfAction)
      .map((r, i) => ({ id: r.id, name: `${r.unitType} (reinforcement)`, wounds: r.stats.W, leader: false, order: 200 + i })),
  ];
  const state = (id: string): State => session.activation[id] ?? 'none';
  const sorted = [...actors].sort((a, b) => RANK[state(a.id)] - RANK[state(b.id)]
    || b.wounds - a.wounds || Number(b.leader) - Number(a.leader) || a.order - b.order);
  return (
    <div className="cogitator">
      <SoloPlate>
        <h2 className="font-heading text-3xl">Activation order</h2>
        <p>Tap what each enemy can do this turn. Those who can charge go first, then those with a line of sight, then the rest; more Wounds first, then the leader.</p>
        <ol className="space-y-1">
          {sorted.map((actor, index) => (
            <li key={actor.id} className="flex items-center justify-between gap-2">
              <span>{index + 1}. {actor.name}</span>
              <button
                type="button"
                className="min-h-[44px] px-2 font-ui underline"
                aria-label={`${actor.name}: ${LABEL[state(actor.id)]}. Tap to change.`}
                onClick={() => update({ activation: { ...session.activation, [actor.id]: NEXT[state(actor.id)] } })}
              >
                {LABEL[state(actor.id)]}
              </button>
            </li>
          ))}
        </ol>
        <p>Unclear? Pick what makes the better story, or roll a die.</p>
      </SoloPlate>
    </div>
  );
}
