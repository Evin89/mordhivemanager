import { WarbandDefinition } from '../data/types';
import { createWarband, createHeroFromSlot, createHenchmenGroupFromType } from './warbandFactory';
import { equipNpcModel } from './npc';

export type EnemyShape = 'balanced' | 'hunting-party' | 'swarm';
export const shapeLabels: Record<EnemyShape, string> = {
  balanced: 'Balanced',
  'hunting-party': 'Hunting party',
  swarm: 'Swarm',
};

export function buildShapedNpc(def: WarbandDefinition, budget: number, shape: Exclude<EnemyShape, 'balanced'>) {
  const warband = createWarband(def, `${def.name} (AI)`);
  let gold = budget;
  let size = 0;
  const cap = def.maxWarbandSize ?? 20;
  const slots = def.heroSlots.filter(slot => slot.isLeader || shape === 'hunting-party');
  slots.sort((a, b) => Number(b.isLeader) - Number(a.isLeader) || (b.cost ?? 0) - (a.cost ?? 0));
  for (const slot of slots) {
    if (slot.cost === null || slot.maxCount === 0) continue;
    const limit = slot.isLeader ? 1 : slot.maxCount ?? cap;
    for (let n = 0; n < limit && size < cap; n++) {
      const hero = createHeroFromSlot(slot, slot.unitType);
      hero.equipment.push(...equipNpcModel(def, slot.equipmentOptions, hero.stats));
      const cost = slot.cost + hero.equipment.reduce((sum, e) => sum + (e.cost ?? 0), 0);
      if (cost > gold) break;
      warband.heroes.push(hero);
      gold -= cost;
      size += 1;
    }
  }
  const types = def.henchmenTypes.filter(type => type.cost !== null && type.cost > 0 && type.maxCount !== 0);
  types.sort((a, b) => shape === 'swarm' ? a.cost! - b.cost! : b.cost! - a.cost!);
  const type = types[0];
  if (type) {
    const template = createHenchmenGroupFromType(type, type.unitType, 1);
    if (!type.isAnimal) template.equipment.push(...equipNpcModel(def, type.equipmentOptions, template.stats));
    const cost = type.cost! + template.equipment.reduce((sum, e) => sum + (e.cost ?? 0), 0);
    const count = Math.min(cap - size, shape === 'hunting-party' ? 5 : Infinity, type.maxCount ?? Infinity, Math.floor(gold / cost));
    for (let remaining = count; remaining > 0; remaining -= 5) {
      const group = createHenchmenGroupFromType(type, type.unitType, Math.min(5, remaining));
      group.equipment = template.equipment.map(e => ({ ...e }));
      warband.henchmenGroups.push(group);
    }
    gold -= count * cost;
  }
  warband.gold = gold;
  return warband;
}
