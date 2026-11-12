import { ModelStatus, Warband, Hero, HenchmenGroup, HiredSword, EquipmentItem } from '../types';
import { getWarbandDefinition } from '../data/warbandRegistry';

// Warband rating — a real engine delta from Mordheim (spec §3).
//
// Mordheim uses (models × 5) + XP. Mord Hive v0.5 states that base formula but
// *recommends* the equation the app should prefer:
//
//     (thrones spent on models & equipment) + (XP × 2) = Warband Rating
//
// "Thrones spent on a model" is its hire cost; the saved Warband doesn't store
// that per model, so it's looked up from the warband definition by unit type at
// rating time (no schema change). Equipment cost is summed off each item's own
// `cost`. XP counts double. Sourcing (§8): the equation is from v0.5 — not tuned
// from memory.
const ACTIVE_STATUSES = new Set(['active', 'missNextGame']);

/**
 * Whether a model is still part of the warband. "Misses next game" counts — he
 * is injured, not gone. Dead/captured/left are out. Exported so the roster sheet
 * and the rating agree on who is in the warband.
 */
export function isInWarband(status: ModelStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

/** Standalone helper: the v0.5 recommended equation, thrones-spent + XP×2. */
export function mordhiveRating(thronesSpent: number, totalExperience: number): number {
  return thronesSpent + totalExperience * 2;
}

function equipmentThrones(equipment: EquipmentItem[]): number {
  return equipment.reduce((sum, item) => sum + (item.cost ?? 0), 0);
}

/** Hire cost of a unit type from its warband definition, or 0 if unknown. */
function unitHireCost(warbandType: string, unitType: string): number {
  const def = getWarbandDefinition(warbandType);
  if (!def) return 0;
  const hero = def.heroSlots.find((s) => s.unitType === unitType);
  if (hero) return hero.cost ?? 0;
  const hench = def.henchmenTypes.find((h) => h.unitType === unitType);
  if (hench) return hench.cost ?? 0;
  return 0;
}

function heroThrones(warbandType: string, hero: Hero): number {
  return unitHireCost(warbandType, hero.unitType) + equipmentThrones(hero.equipment);
}

function groupThrones(warbandType: string, group: HenchmenGroup): number {
  return (unitHireCost(warbandType, group.unitType) + equipmentThrones(group.equipment)) * group.count;
}

function swordThrones(sword: HiredSword): number {
  return sword.hireFee + equipmentThrones(sword.equipment);
}

export function computeWarbandRating(warband: Warband): number {
  let rating = 0;

  for (const hero of warband.heroes) {
    if (!ACTIVE_STATUSES.has(hero.status)) continue;
    rating += heroThrones(warband.warbandType, hero) + hero.xp * 2;
  }

  for (const group of warband.henchmenGroups) {
    // group.xp is the Experience of *each* member, so XP counts once per model.
    rating += groupThrones(warband.warbandType, group) + group.xp * 2 * group.count;
  }

  for (const sword of warband.hiredSwords) {
    if (!ACTIVE_STATUSES.has(sword.status)) continue;
    // Hired Guns carry their own rating line in the book ("+55 points, plus 2
    // points for each Experience Point"), so that is used where known.
    rating += (sword.ratingBase ?? swordThrones(sword)) + sword.xp * 2;
  }

  return rating;
}

export function countModels(warband: Warband): number {
  let count = 0;
  for (const hero of warband.heroes) {
    if (ACTIVE_STATUSES.has(hero.status)) count += 1;
  }
  for (const group of warband.henchmenGroups) {
    count += group.count;
  }
  for (const sword of warband.hiredSwords) {
    if (ACTIVE_STATUSES.has(sword.status)) count += 1;
  }
  return count;
}
