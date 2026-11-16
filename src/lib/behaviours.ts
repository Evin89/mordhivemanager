import type { EquipmentItem, StatLine, Warband } from '../types';
import type { NpcAgenda, NpcTemperament } from './npc';
export type Behaviour = 'brawler' | 'marksman' | 'lurker' | 'guardian' | 'beast' | 'leader';
export const labels: Record<Behaviour, string> = { brawler: 'Brawler', marksman: 'Marksman', lurker: 'Lurker', guardian: 'Guardian', beast: 'Beast', leader: 'Leader' };
export function baseBehaviour(actor: { isAnimal?: boolean; isLeader?: boolean; equipment: EquipmentItem[]; stats: StatLine }): Behaviour {
  if (actor.isAnimal) return 'beast';
  if (actor.isLeader) return 'leader';
  return actor.equipment.some(e => e.category === 'missile') && actor.stats.BS >= actor.stats.WS && actor.stats.BS >= 3 ? 'marksman' : 'brawler';
}
export function assignBehaviours(w: Warband, agenda: NpcAgenda | null): Record<string, Behaviour> {
  const result: Record<string, Behaviour> = {};
  const actors = [...w.heroes, ...w.henchmenGroups];
  actors.forEach(a => { result[a.id] = baseBehaviour(a); });
  const shuffle = (ids: string[]) => { const a = [...ids]; for(let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const eligible = actors.filter(a => !['leader','beast'].includes(result[a.id])).map(a=>a.id);
  if (agenda && ['Secure the Find','Hold the Ruins'].includes(agenda.objective)) shuffle(eligible).slice(0,2).forEach(id=> { result[id]='guardian'; });
  if (agenda?.temperament === 'cunning') shuffle(eligible).slice(0,w.heroes.length+w.henchmenGroups.reduce((n,g)=>n+g.count,0)>=8?2:1).forEach(id=> {result[id]='lurker';});
  return result;
}
const lists: Record<Behaviour, string[]> = {
 brawler: ['Charge the priority target if in charge reach.', 'Run toward the priority target, ending in cover if a route allows without losing more than 2".', 'Move toward the priority target into cover.', 'Hold in cover.'],
 marksman: ['If an enemy can charge it next turn and cover with a line of sight is within a normal move, fall back to that cover, then shoot.', 'Shoot the priority target without moving.', 'Move (do not run) to the nearest cover with a line of sight to an enemy, then shoot if allowed.', 'Run toward the nearest position with a line of sight.'],
 lurker: ['If hidden and no enemy is within 8", stay hidden.', 'Charge an enemy within charge reach that is alone (no friend within 6") or knocked down/stunned.', 'Shoot the priority target if it has a missile weapon.', 'Move through cover toward the nearest lone enemy and hide if able.'],
 guardian: ['Charge an enemy within 6" of the objective.', 'Shoot an enemy within sight of the objective.', 'Move to within 3" of the objective, in cover.', 'Hold.'],
 beast: ['Charge the nearest enemy in reach.', 'Run the full distance toward the nearest enemy, ignoring cover.'],
 leader: ['If the warband has lost a third or more of its models, move toward its own table edge keeping other models within Leadership range.', 'Charge a knocked-down, stunned or wounded enemy in reach.', 'Shoot the priority target if it has a missile weapon.', 'Move to stay within 6" of the most friendly models, behind the front, in cover.'],
};
export function behaviourSteps(behaviour: Behaviour, temperament?: NpcTemperament): string[] {
 const effective = temperament === 'frenzied' && ['brawler','guardian','lurker'].includes(behaviour) ? 'beast' : behaviour;
 const steps = [...lists[effective]];
 if(temperament==='aggressive' && effective==='brawler') { steps[1]='Run toward the priority target.'; steps[2]='Move toward the priority target.'; }
 if(temperament==='cautious' && effective!=='beast') steps.unshift('If this model is wounded or the warband has lost a third or more of its models, move into cover away from the nearest enemy.');
 return steps;
}
