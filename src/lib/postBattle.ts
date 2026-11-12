import { BattleResult, StatLine, Warband, Hero, HenchmenGroup, HiredSword } from '../types';
import { BattleSession } from '../store/battle';
import { generateId } from './id';
import injuriesData from '../data/injuries.json';
import advancesData from '../data/advances.json';
import xpThresholds from '../data/xpThresholds.json';

// The post-battle sequence, engine side (spec §5 / MM §4.3). A staged draft is
// assembled from the warband and the battle session's casualty tally, edited
// through the wizard, and applied to the warband in one go on confirm.

const d6 = () => 1 + Math.floor(Math.random() * 6);

// --- Injuries (Heroes: D66; Henchmen: D6 removal) ---

export type InjuryResult = { roll: string; name: string; effect: string };

export function rollInjury(): InjuryResult {
  const roll = `${d6()}${d6()}`;
  const entry = injuriesData.table.find((t) => t.roll === roll) ?? injuriesData.table[0];
  return { roll, name: entry.name, effect: entry.effect };
}

/** A Henchman out of action is removed permanently on a D6 of 1-2. */
export function rollHenchmanRemoval(): boolean {
  return d6() <= 2;
}

// --- Advances (2D6; thresholds off the XP track) ---

export type Advance = { roll: number; text: string; stat?: keyof StatLine; skill?: boolean; ladsGotTalent?: boolean };

const HERO_ADV = advancesData.heroAdvanceTable.entries;
const HENCH_ADV = advancesData.henchmenAdvanceTable.entries;

function lowerOf(stats: StatLine, a: keyof StatLine, b: keyof StatLine): keyof StatLine {
  return stats[a] <= stats[b] ? a : b;
}

/** Rolls a Hero advance and resolves any sub-roll / choice into a concrete
 * stat or a "pick a new skill" flag. Choices auto-pick the lower stat (a sane
 * default the player can re-weigh on the model's card). */
export function rollHeroAdvance(stats: StatLine): Advance {
  const roll = d6() + d6();
  const text = HERO_ADV.find((e) => e.roll === String(roll))?.result ?? '';
  if (roll === 6) return { roll, text, stat: d6() <= 3 ? 'S' : 'A' };
  if (roll === 7) return { roll, text, stat: lowerOf(stats, 'WS', 'BS') };
  if (roll === 8) return { roll, text, stat: d6() <= 3 ? 'I' : 'Ld' };
  if (roll === 9) return { roll, text, stat: d6() <= 3 ? 'W' : 'T' };
  return { roll, text, skill: true }; // 2-5, 10-12
}

export function rollHenchmenAdvance(stats: StatLine): Advance {
  const roll = d6() + d6();
  const text = HENCH_ADV.find((e) => e.roll === String(roll))?.result ?? '';
  if (roll <= 4) return { roll, text, stat: 'I' };
  if (roll === 5) return { roll, text, stat: 'S' };
  if (roll <= 7) return { roll, text, stat: lowerOf(stats, 'WS', 'BS') };
  if (roll === 8) return { roll, text, stat: 'A' };
  if (roll === 9) return { roll, text, stat: 'Ld' };
  return { roll, text, ladsGotTalent: true }; // 10-12
}

/** How many advance rolls a model earns when its XP goes from `oldXp` to
 * `newXp` — the number of threshold boxes crossed. */
export function advancesEarned(oldXp: number, newXp: number, hero: boolean): number {
  const list = (hero ? xpThresholds.heroThresholds : xpThresholds.henchmenThresholds) as { xp: number | null }[];
  return list.filter((t) => t.xp !== null && (t.xp as number) > oldXp && (t.xp as number) <= newXp).length;
}

// --- The draft ---

export type HeroPB = {
  outOfAction: boolean;
  injury: InjuryResult | null;
  dies: boolean;
  xpGained: number;
  advances: Advance[];
};

export type HenchPB = {
  outOfActionCount: number;
  diedCount: number;
  xpGained: number;
  advances: Advance[];
};

/** A Hired Gun's battle (v0.5 p.126): injuries as a Henchman (1-2 = Lost),
 * XP as a Henchman, advances on the Heroes table, upkeep after every battle. */
export type HiredPB = {
  outOfAction: boolean;
  lost: boolean;
  xpGained: number;
  advances: Advance[];
  /** Pay his upkeep and keep him. Unpaid, he leaves and his XP is lost. */
  keep: boolean;
};

export type PostBattleDraft = {
  result: BattleResult;
  enemiesTakenOut: number;
  heroes: Record<string, HeroPB>;
  henchmen: Record<string, HenchPB>;
  hired: Record<string, HiredPB>;
  diamantineFound: number;
  goldFound: number;
  notes: string;
};

/** Builds the initial draft: casualties come from the battle tally; the
 * universal "+1 Survives" and the winning-leader bonus are pre-filled as
 * editable defaults. */
export function createDraft(warband: Warband, session: BattleSession | undefined): PostBattleDraft {
  const win = false; // set by the player in Battle Info; XP recomputed there
  const heroes: Record<string, HeroPB> = {};
  for (const h of warband.heroes) {
    heroes[h.id] = {
      outOfAction: session?.outOfAction.heroIds.includes(h.id) ?? false,
      injury: null,
      dies: false,
      xpGained: 1, // +1 Survives
      advances: [],
    };
  }
  const henchmen: Record<string, HenchPB> = {};
  for (const g of warband.henchmenGroups) {
    henchmen[g.id] = {
      outOfActionCount: session?.outOfAction.henchmenCounts[g.id] ?? 0,
      diedCount: 0,
      xpGained: 1, // +1 Survives (per group)
      advances: [],
    };
  }
  const hired: Record<string, HiredPB> = {};
  for (const h of warband.hiredSwords) {
    if (h.status !== 'active' && h.status !== 'missNextGame') continue;
    hired[h.id] = { outOfAction: false, lost: false, xpGained: 1, advances: [], keep: true };
  }
  const enemiesTakenOut = session?.npcOutOfAction
    ? session.npcOutOfAction.heroIds.length +
      Object.values(session.npcOutOfAction.henchmenCounts).reduce((s, n) => s + n, 0)
    : 0;

  return { result: win ? 'win' : 'draw', enemiesTakenOut, heroes, henchmen, hired, diamantineFound: 0, goldFound: 0, notes: '' };
}

// Injury → concrete effects the app can apply. Anything not mapped is recorded
// as a note on the model rather than silently dropped.
function injuryEffect(name: string): { stat?: Partial<StatLine>; missNextGame?: boolean; xp?: number } {
  switch (name) {
    case 'Leg Wound': return { stat: { M: -1 } };
    case 'Chest Wound': return { stat: { T: -1 } };
    case 'Blinded in One Eye': return { stat: { BS: -1 } };
    case 'Nervous Condition': return { stat: { I: -1 } };
    case 'Hand Injury': return { stat: { WS: -1 } };
    case 'Arm Wound':
    case 'Smashed Leg':
    case 'Deep Wound': return { missNextGame: true };
    case 'Survives Against the Odds': return { xp: 2 };
    default: return {};
  }
}

function applyAdvances(stats: StatLine, advances: Advance[]): { stats: StatLine; notes: string[] } {
  const next = { ...stats };
  const notes: string[] = [];
  for (const a of advances) {
    if (a.stat) next[a.stat] = (next[a.stat] ?? 0) + 1;
    if (a.skill) notes.push('Advance: may pick a new skill (choose it on the model’s card).');
    if (a.ladsGotTalent) notes.push('Advance: The Lad’s Got Talent — one model should become a Hero.');
  }
  return { stats: next, notes };
}

/** Applies the whole draft to the warband, returning a new Warband. */
export function applyDraft(warband: Warband, draft: PostBattleDraft): Warband {
  const heroes: Hero[] = [];
  for (const h of warband.heroes) {
    const pb = draft.heroes[h.id];
    if (!pb) { heroes.push(h); continue; }
    if (pb.dies) {
      heroes.push({ ...h, status: 'dead' });
      continue;
    }
    let stats = { ...h.stats };
    const noteParts: string[] = [];
    let status = h.status;
    let xp = h.xp + pb.xpGained;

    if (pb.injury) {
      const eff = injuryEffect(pb.injury.name);
      if (eff.stat) for (const [k, v] of Object.entries(eff.stat)) stats[k as keyof StatLine] += v as number;
      if (eff.missNextGame) status = 'missNextGame';
      if (eff.xp) xp += eff.xp;
      noteParts.push(`Injury (${pb.injury.roll}): ${pb.injury.name} — ${pb.injury.effect}`);
    }
    const adv = applyAdvances(stats, pb.advances);
    stats = adv.stats;
    noteParts.push(...adv.notes);

    heroes.push({
      ...h,
      stats,
      xp,
      status,
      injuries: pb.injury
        ? [...h.injuries, { id: generateId(), name: pb.injury.name, effect: pb.injury.effect, dateAcquired: new Date().toISOString().slice(0, 10) }]
        : h.injuries,
      notes: [h.notes, ...noteParts].filter(Boolean).join('\n'),
    });
  }

  const henchmenGroups: HenchmenGroup[] = [];
  for (const g of warband.henchmenGroups) {
    const pb = draft.henchmen[g.id];
    if (!pb) { henchmenGroups.push(g); continue; }
    const count = Math.max(0, g.count - pb.diedCount);
    if (count === 0) continue; // group wiped out
    const adv = applyAdvances(g.stats, pb.advances);
    henchmenGroups.push({
      ...g,
      count,
      xp: g.xp + pb.xpGained,
      stats: adv.stats,
      notes: [g.notes, ...adv.notes].filter(Boolean).join('\n'),
    });
  }

  let upkeepPaid = 0;
  const hiredSwords: HiredSword[] = warband.hiredSwords.map((h) => {
    const pb = draft.hired?.[h.id];
    if (!pb) return h;
    if (pb.lost) return { ...h, status: 'dead' };
    if (!pb.keep) return { ...h, status: 'left', xp: h.startingXp };
    upkeepPaid += h.upkeep;
    const adv = applyAdvances(h.stats, pb.advances);
    return {
      ...h,
      xp: h.xp + pb.xpGained,
      stats: adv.stats,
      status: h.status === 'missNextGame' ? 'active' : h.status,
      notes: [h.notes, ...adv.notes].filter(Boolean).join('\n'),
    };
  });

  return {
    ...warband,
    heroes,
    henchmenGroups,
    hiredSwords,
    wyrdstoneShards: warband.wyrdstoneShards + draft.diamantineFound,
    gold: warband.gold + draft.goldFound - upkeepPaid,
  };
}

/** Upkeep due for the Hired Guns the player is keeping (and who weren't lost). */
export function upkeepDue(warband: Warband, draft: PostBattleDraft): number {
  return warband.hiredSwords.reduce((sum, h) => {
    const pb = draft.hired?.[h.id];
    return pb && pb.keep && !pb.lost ? sum + h.upkeep : sum;
  }, 0);
}
