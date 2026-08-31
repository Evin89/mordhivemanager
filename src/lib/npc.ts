import { WarbandDefinition } from '../data/types';
import { Warband, StatLine } from '../types';
import { createWarband, createHeroFromSlot, createHenchmenGroupFromType } from './warbandFactory';

// The app-built AI opponent for a solo game (spec §6). Everything here — how the
// enemy warband is composed and how it behaves — is APP-ORIGINAL, not part of
// the Mord Hive ruleset, and is surfaced as suggestions badged as such. Only the
// statlines/costs it draws on are sourced (from the warband definitions).

/**
 * Builds a full-strength enemy warband from a sourced list, spending toward a
 * thrones budget: the mandatory leader, then one of each other Hero it can
 * afford, then the cheapest henchmen filled toward the size cap. Deterministic
 * enough to be fair, fuller than the player's "quick start" since an opponent
 * should be a real threat. Names are auto-assigned; models carry only the free
 * dagger (their loadout is abstract for the tracker).
 */
export function buildNpcWarband(def: WarbandDefinition, budget = 500): Warband {
  const warband = createWarband(def, `${def.name} (AI)`);
  let gold = budget;
  const sizeCap = def.maxWarbandSize ?? 20;
  let size = 0;

  const leaderSlot = def.heroSlots.find((s) => s.isLeader);
  if (leaderSlot) {
    warband.heroes.push(createHeroFromSlot(leaderSlot, leaderSlot.unitType));
    gold = Math.max(0, gold - (leaderSlot.cost ?? 0));
    size += 1;
  }

  // One of each affordable non-leader hero, cheapest first, keeping henchmen headroom.
  const otherHeroes = def.heroSlots
    .filter((s) => !s.isLeader && s.cost !== null)
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
  for (const slot of otherHeroes) {
    if (size >= sizeCap) break;
    const cost = slot.cost ?? 0;
    if (cost > gold - 40) continue;
    warband.heroes.push(createHeroFromSlot(slot, slot.unitType));
    gold -= cost;
    size += 1;
  }

  // Fill toward the cap with the cheapest henchman type (in groups of up to 5).
  const cheapest = def.henchmenTypes
    .filter((t) => (t.cost ?? 0) > 0)
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0];
  if (cheapest) {
    const cost = cheapest.cost as number;
    let n = 0;
    const perTypeCap = cheapest.maxCount ?? Number.POSITIVE_INFINITY;
    while (size < sizeCap && n < perTypeCap && gold >= cost) {
      gold -= cost;
      size += 1;
      n += 1;
    }
    // Split into groups of 5, as the rules recruit henchmen.
    let remaining = n;
    let groupIndex = 1;
    while (remaining > 0) {
      const g = Math.min(5, remaining);
      warband.henchmenGroups.push(
        createHenchmenGroupFromType(cheapest, `${cheapest.unitType} ${groupIndex}`, g),
      );
      remaining -= g;
      groupIndex += 1;
    }
  }

  warband.gold = gold;
  return warband;
}

// --- Temperament & hidden agenda (app-original solo-mode flavour, §6) ---

export type NpcTemperament = 'aggressive' | 'cautious' | 'cunning' | 'frenzied';

export const TEMPERAMENT_LABELS: Record<NpcTemperament, string> = {
  aggressive: 'Aggressive',
  cautious: 'Cautious',
  cunning: 'Cunning',
  frenzied: 'Frenzied',
};

export const TEMPERAMENT_HINTS: Record<NpcTemperament, string> = {
  aggressive: 'Presses forward and charges at every opening.',
  cautious: 'Uses cover, holds firing lines, commits only when it must.',
  cunning: 'Flanks, isolates, and picks off the weak and the lone.',
  frenzied: 'Throws itself at the nearest foe with no regard for losses.',
};

/**
 * The enemy's secret objective. Public to the app but hidden from the solo
 * player until revealed (at battle's end) — it's what gives the AI opponent a
 * sense of purpose beyond "kill everything". App-original, not ruleset content.
 */
export type NpcAgenda = {
  temperament: NpcTemperament;
  /** Short title, shown when revealed. */
  objective: string;
  /** How the opponent "wins" its own game, shown when revealed. */
  reveal: string;
};

const AGENDA_POOL: Omit<NpcAgenda, 'temperament'>[] = [
  { objective: 'Secure the Find', reveal: 'Hold the central objective when the dust settles — the diamantine is all that matters.' },
  { objective: 'Decapitation', reveal: 'Put the enemy leader out of action; the rest can scatter.' },
  { objective: 'Smash and Grab', reveal: 'Grab what diamantine it can and withdraw off a board edge before it bleeds out.' },
  { objective: 'Bloodletting', reveal: 'Take as many of the enemy out of action as possible — a message written in bodies.' },
  { objective: 'Hold the Ruins', reveal: 'Control more of the standing buildings than the enemy at the end.' },
  { objective: 'Probe and Withdraw', reveal: 'Test the enemy, then rout on its own terms before losing a third of the warband.' },
];

const TEMPERAMENTS: NpcTemperament[] = ['aggressive', 'cautious', 'cunning', 'frenzied'];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Rolls a hidden agenda + temperament for a freshly generated opponent. */
export function generateAgenda(): NpcAgenda {
  return { temperament: pick(TEMPERAMENTS), ...pick(AGENDA_POOL) };
}

export type NpcActor = {
  name: string;
  unitType: string;
  isLeader: boolean;
  isAnimal: boolean;
  stats: StatLine;
};

/**
 * A per-turn activation suggestion for one enemy model. A deliberately simple,
 * transparent heuristic — role first, then a shooting/melee lean read off the
 * profile, with pressure ramping over the game, then shaded by the warband's
 * temperament. Guidance for a solo player, never an authoritative move; it is
 * app-original, not ruleset content.
 */
export function suggestNpcAction(actor: NpcActor, turn: number, temperament: NpcTemperament = 'aggressive'): string {
  const base = baseAction(actor, turn);
  const flavour = temperamentRider(actor, temperament);
  return flavour ? `${base} ${flavour}` : base;
}

function baseAction(actor: NpcActor, turn: number): string {
  if (actor.isAnimal) {
    return 'Move the full distance toward the nearest enemy and charge if it can reach — no fear, no hesitation.';
  }
  if (actor.isLeader) {
    return turn <= 2
      ? 'Hold a central position where it can lend its Leadership; push behind the front.'
      : 'Commit: advance with the pack, staying close enough to keep models in command range, and charge a weakened target.';
  }
  const shooter = actor.stats.BS >= actor.stats.WS && actor.stats.BS >= 3;
  if (shooter) {
    return turn <= 2
      ? 'Take up a firing position with a clear line of sight and shoot the nearest visible enemy.'
      : 'Hold the firing line and shoot the most dangerous or closest target; fall back a step if charged.';
  }
  return turn <= 1
    ? 'Advance the full distance toward the nearest enemy, using cover where possible.'
    : 'Charge the nearest enemy in reach; otherwise advance to threaten a charge next turn.';
}

function temperamentRider(actor: NpcActor, temperament: NpcTemperament): string {
  switch (temperament) {
    case 'aggressive':
      return actor.isLeader ? '' : 'Favour the charge over the safe move.';
    case 'cautious':
      return 'Stay in cover and give ground rather than take a bad fight.';
    case 'cunning':
      return 'Prefer an isolated, wounded, or lone target over the nearest one.';
    case 'frenzied':
      return 'Go for the throat regardless of the odds.';
    default:
      return '';
  }
}

/** Aggregate difficulty label from a budget, shown when generating an opponent. */
export function difficultyForBudget(budget: number): string {
  if (budget <= 350) return 'Skirmish';
  if (budget <= 550) return 'Even';
  return 'Overwhelming';
}
