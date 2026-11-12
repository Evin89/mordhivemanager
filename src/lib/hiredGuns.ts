import hiredGunsData from '../data/hiredGuns.json';
import { NullableStatLine } from '../data/types';
import { EquipmentCategory, EquipmentItem, HiredSword, StatLine } from '../types';
import { generateId } from './id';

// Hired Guns (Mord Hive v0.5, pp.127-130). Everything a player sees here is the
// rulebook's own text; the only logic is (a) the hiring restrictions the book
// states by name, and (b) the arithmetic of fees, upkeep and rating.

export type StartingGear = { name: string; category: EquipmentCategory; count?: number; notes?: string };
export type StartingGearOption = { label: string; items: StartingGear[] };
export type StartingEquipment = { fixed: StartingGear[]; choice?: StartingGearOption[] };

export type HiredGunDefinition = {
  id: string;
  name: string;
  hireFee: number;
  upkeep: number;
  mayBeHiredBy: string;
  ratingBonus: string;
  /** The flat part of the book's rating line ("+55 points, plus 2 per XP"). */
  ratingBase: number;
  statLine: NullableStatLine;
  equipment: string;
  skillLists: string[];
  spellLists?: string[];
  startingSpells?: number;
  isLargeCreature: boolean;
  /** "Any 'Imperial' warband" — the book doesn't list which warbands count. */
  imperialOnly?: boolean;
  xenos?: boolean;
  excludedWarbands?: string[];
  upkeepOverrides?: Record<string, number>;
  specialRules: string;
  source: string;
};

type HiredGunsData = {
  rules: { recruiting: string; hireFee: string; injuries: string; experience: string };
  hiredGuns: HiredGunDefinition[];
  startingEquipment: Record<string, StartingEquipment>;
};

const data = hiredGunsData as unknown as HiredGunsData;

export const hiredGunRules = data.rules;
export const hiredGunDefinitions: HiredGunDefinition[] = data.hiredGuns;

export function getHiredGunDefinition(id: string | undefined): HiredGunDefinition | undefined {
  return hiredGunDefinitions.find((d) => d.id === id || d.name === id);
}

export function getStartingEquipment(id: string): StartingEquipment | undefined {
  return data.startingEquipment[id];
}

// Restrictions the warband entries state by name (src/data/warbands/*.json,
// specialRules). Anything vaguer than that ("Imperial", "Abhuman") is shown to
// the player as a check, not enforced, because the book doesn't say which
// warbands or Hired Guns it covers.
const LOST_AND_DAMNED_ALLOWED = new Set(['chronoGladiator', 'ogrynBodyguard', 'unsanctionedPsyker']);
const NO_XENOS = new Set(['forsaken-astartes', 'ordo-hereticus-retainers']);

export type Availability = { allowed: boolean; reason?: string; check?: string };

export function hiredGunAvailability(def: HiredGunDefinition, warbandType: string, alreadyHired: boolean): Availability {
  if (alreadyHired) return { allowed: false, reason: 'You can only have one of each type of Hired Gun.' };
  if (def.excludedWarbands?.includes(warbandType)) return { allowed: false, reason: def.mayBeHiredBy };
  if (warbandType === 'lost-and-the-damned' && !LOST_AND_DAMNED_ALLOWED.has(def.id)) {
    return { allowed: false, reason: 'The Lost and the Damned may only hire Chrono-Gladiators, Ogryn Bodyguards and Unsanctioned Psykers.' };
  }
  if (def.xenos && NO_XENOS.has(warbandType)) {
    return { allowed: false, reason: 'This warband may never hire Xenos Hired Guns.' };
  }
  const checks: string[] = [];
  if (def.imperialOnly) checks.push(`${def.mayBeHiredBy} Check with your group whether yours counts.`);
  if (warbandType === 'ordo-hereticus-retainers') {
    checks.push('Ordo Hereticus Retainers may never hire Xenos, Chaotic or Abhuman Hired Guns.');
  }
  if (warbandType === 'lost-and-the-damned' && def.id === 'unsanctionedPsyker') {
    checks.push('Not if your warband has the Mark of the Bloodied Hound.');
  }
  return { allowed: true, check: checks.join(' ') || undefined };
}

export function upkeepFor(def: HiredGunDefinition, warbandType: string): number {
  return def.upkeepOverrides?.[warbandType] ?? def.upkeep;
}

function toStats(line: NullableStatLine): StatLine {
  const out = {} as StatLine;
  for (const k of Object.keys(line) as (keyof StatLine)[]) out[k] = line[k] ?? 0;
  return out;
}

const GEAR_NOTE = "Comes with the Hired Gun (his entry's equipment).";

export function buildStartingEquipment(id: string, choiceIndex = 0): EquipmentItem[] {
  const entry = getStartingEquipment(id);
  if (!entry) return [];
  const option = entry.choice?.[choiceIndex] ?? entry.choice?.[0];
  const items: EquipmentItem[] = [];
  for (const g of [...entry.fixed, ...(option?.items ?? [])]) {
    for (let i = 0; i < (g.count ?? 1); i++) {
      items.push({
        id: generateId(),
        name: g.name,
        category: g.category,
        cost: 0,
        notes: g.notes ? `${g.notes} ${GEAR_NOTE}` : GEAR_NOTE,
      });
    }
  }
  return items;
}

/** A Hired Gun as he joins the roster. His gear is fixed by his entry: he never shops. */
export function createHiredGun(
  def: HiredGunDefinition,
  warbandType: string,
  opts: { name?: string; choiceIndex?: number; spells?: string[] } = {},
): HiredSword {
  const stats = toStats(def.statLine);
  return {
    id: generateId(),
    name: opts.name?.trim() || def.name,
    type: def.name,
    definitionId: def.id,
    hireFee: def.hireFee,
    upkeep: upkeepFor(def, warbandType),
    ratingBase: def.ratingBase,
    isLeader: false,
    isLargeCreature: def.isLargeCreature,
    countsTowardMax: false,
    stats,
    // The book gives Hired Guns no separate maximum profile; the starting line
    // stands in as the ceiling rather than an invented one.
    statMaximums: stats,
    xp: 0,
    startingXp: 0,
    advances: [],
    skillLists: def.skillLists,
    skills: [],
    spellLists: def.spellLists ?? [],
    spells: opts.spells ?? [],
    injuries: [],
    equipment: buildStartingEquipment(def.id, opts.choiceIndex ?? 0),
    status: 'active',
    notes: '',
  };
}
