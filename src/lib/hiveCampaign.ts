import type { CampaignAgenda } from './soloAgenda';
import scenariosData from '../data/scenarios.json';
import type { Warband } from '../types';
import { rollHiveEvent } from './oracle';
import { soloScenarios } from './soloScenarios';

export const SECTORS = [
  { id: 'spire', name: 'The Spire', line: 'Empty halls, and the only landing pads left.' },
  { id: 'hab-stacks', name: 'The Hab-stacks', line: 'Ten thousand dark floors.' },
  { id: 'wound', name: 'The Wound', line: 'Where the Hulk struck. Still burning.' },
  { id: 'refineries', name: 'The Refineries', line: 'Cold crucibles and loose shards.' },
  { id: 'underhive', name: 'The Underhive', line: 'Tunnels, shanties, a line that still hums.' },
  { id: 'sump', name: 'The Sump', line: 'Black water and catacombs.' },
] as const;

export type SectorId = typeof SECTORS[number]['id'];
export const CONDITIONS = {
  quiet: { name: 'Quiet', line: 'No surprises.', budget: 0 },
  'on-alert': { name: 'On Alert', line: 'They are listening for you.', budget: 0 },
  'hunting-party': { name: 'Hunting Party', line: 'More of them than usual.', budget: 100 },
  'thin-patrols': { name: 'Thin Patrols', line: 'Most of them are elsewhere.', budget: -100 },
  'rich-seam': { name: 'Rich Seam', line: 'Worth the risk.', budget: 0 },
  bounty: { name: 'Bounty', line: 'Someone is paying for results.', budget: 0 },
  'ash-storm': { name: 'Ash Storm', line: 'The air itself is against you.', budget: 0 },
  'nemesis-present': { name: 'The Nemesis Walks', line: '{Leader name} leads them in person.', budget: 50 },
} as const;
export type ConditionId = keyof typeof CONDITIONS;
export type HiveMission = {
  id: string;
  sector: SectorId;
  stake: 'raid' | 'defence' | 'reckoning';
  /** A book scenario id, or a solo scenario id (`solo-…`) for an operation step. */
  scenarioId: string;
  condition: ConditionId;
  budget: number;
  operation?: { id: OperationId; step: number };
};

/** Phase 6 (after ACOLYTE's strategic assets): lasting, campaign-only advantages
 *  that act on the app's own systems, never on the warband. */
export const ASSETS = [
  { id: 'spy-network', name: 'Spy Network', text: 'Once per battle you may set the intel card aside and draw another. You keep the second.' },
  { id: 'informant', name: 'Informant', text: 'The mission board shows a fourth mission.' },
  { id: 'seer', name: 'Seer', text: 'Foresight once per battle: when an alarm event or Reckoning card is drawn, see two and keep one.' },
  { id: 'safehouse', name: 'Safehouse', text: 'A lost defence costs 1 control instead of 2.' },
  { id: 'vox-relay', name: 'Vox Relay', text: 'The first reinforcement of every battle never arrives.' },
  { id: 'cut-outs', name: 'Cut-outs', text: 'Once this campaign, turn the plan clock back by 2.' },
] as const;
export type AssetId = typeof ASSETS[number]['id'];

/** Phase 6 (after ACOLYTE's adventure chains): two solo scenarios fought back to
 *  back in one sector. Winning both earns an asset. */
export const OPERATIONS = [
  { id: 'materiel-raid', name: 'Materiel Raid', steps: ['solo-break-in', 'solo-way-out'] },
  { id: 'cut-the-line', name: 'Cut the Line', steps: ['solo-sabotage', 'solo-hold'] },
  { id: 'one-of-ours', name: 'One of Ours', steps: ['solo-rescue', 'solo-way-out'] },
  { id: 'salvage-run', name: 'Salvage Run', steps: ['solo-salvage', 'solo-hunt'] },
] as const;
export type OperationId = typeof OPERATIONS[number]['id'];

export function operationName(id: OperationId): string {
  return OPERATIONS.find((op) => op.id === id)?.name ?? id;
}

/** Name of a book or solo scenario by id. */
export function scenarioName(id: string): string {
  return scenariosData.scenarios.find((item) => item.id === id)?.name
    ?? soloScenarios.find((item) => item.id === id)?.name ?? id;
}
export type NemesisHero = {
  id: string;
  name: string;
  role: string;
  isLeader: boolean;
  status: 'active' | 'dead' | 'captured';
  grudge?: boolean;
  battles: number;
  timesDown: number;
  scars: number;
};
export type HiveChronicleEntry = {
  turn: number;
  kind: 'battle' | 'nemesis' | 'event' | 'ignored' | 'outcome';
  sector?: SectorId;
  text: string;
  date: string;
};
export type HiveState = {
  /** 'matched': mission budgets start from the warband's rating (phase 6). */
  strength?: 'hive' | 'matched';
  /** The sector the nemesis has announced it will push into this turn (phase 6). */
  threat?: SectorId | null;
  operation?: { id: OperationId; sector: SectorId; step: number } | null;
  assets?: AssetId[];
  assetChoices?: number;
  cutoutsUsed?: boolean;
  clues?: number;
  scheme?: number;
  lastSeen?: SectorId | null;
  dark?: SectorId[];
  vengeance?: boolean;
  reckoningLosses?: number;
  turn: number;
  control: Record<SectorId, number>;
  board: HiveMission[];
  activeMissionId: string | null;
  nemesis: NemesisHero[];
  chronicle: HiveChronicleEntry[];
  outcome: 'won' | 'lost' | null;
};
export type HiveContext = { warband: string; faction: string; agenda?: CampaignAgenda; rating?: number };
type Random = () => number;
const FIRST = ['Varn', 'Sable', 'Korrin', 'Mott', 'Ilse', 'Drey', 'Hask', 'Oriel', 'Tamsin', 'Brask', 'Vess', 'Calder', 'Nix', 'Orrin', 'Maude', 'Jerrik'];
const EPITHETS = ['the Patient', 'Ashmouth', 'of the Ninth Stair', 'Coldhand', 'the Unpaid', 'Lampless', 'Twice-Buried', 'the Ledger', 'Sumpborn', 'Greycoat', 'the Last Shift', 'No-Name'];

function pick<T>(items: readonly T[], rand: Random): T {
  return items[Math.floor(rand() * items.length)];
}

export function generateNemesisName(used: string[], rand: Random = Math.random): string {
  const available = FIRST.flatMap((first) => EPITHETS.map((epithet) => `${first} ${epithet}`))
    .filter((name) => !used.includes(name));
  if (!available.length) throw new Error('All specified nemesis names have been used.');
  return pick(available, rand);
}

/** Faction names in the data sometimes carry their own article ("The Pox Cult");
 *  this keeps the chronicle from printing "the The Pox Cult". */
export function theFaction(faction: string, sentenceStart = false): string {
  return `${sentenceStart ? 'The' : 'the'} ${faction.replace(/^the\s+/i, '')}`;
}

export function sectorName(id: SectorId): string {
  return SECTORS.find((sector) => sector.id === id)!.name;
}

export function adjacentSectors(id: SectorId): SectorId[] {
  const index = SECTORS.findIndex((sector) => sector.id === id);
  return SECTORS.filter((_, i) => Math.abs(i - index) === 1).map((sector) => sector.id);
}

export function reachableSectors(control: HiveState['control'], dark: SectorId[] = []): SectorId[] {
  // The camp in the Underhive is never lost as a base: it and its neighbours stay
  // reachable even when control there has dropped, so the board can never be empty.
  const held = (id: SectorId) => !dark.includes(id) && (id === 'underhive' || control[id] >= 1);
  return SECTORS.filter(({ id }) => !dark.includes(id) && (held(id) || adjacentSectors(id).some(held)))
    .map(({ id }) => id);
}

/** The hive's own curve (350 + 25 a turn), or the warband's rating when the
 *  campaign uses matched strength and a rating is known. */
export function budgetBase(turn: number, strength: HiveState['strength'] = 'hive', rating?: number): number {
  if (strength === 'matched' && rating && rating > 0) return rating;
  return 350 + 25 * Math.min(10, Math.max(0, turn - 1));
}

export function missionBudget(turn: number, control: number, condition: ConditionId, base = budgetBase(turn)): number {
  const budget = base + 75 * Math.max(0, -control) + CONDITIONS[condition].budget;
  return Math.max(250, Math.round(budget / 25) * 25);
}

/** Where the nemesis will push next: a living sector next to one of theirs,
 *  otherwise any living sector that is not already their stronghold. */
export function chooseThreat(state: HiveState, rand: Random = Math.random): SectorId | null {
  const dark = state.dark ?? [];
  const eligible = SECTORS.filter(({ id }) => !dark.includes(id) && state.control[id] > -3);
  const adjacent = eligible.filter(({ id }) => adjacentSectors(id).some((other) => !dark.includes(other) && state.control[other] <= -1));
  const pool = adjacent.length ? adjacent : eligible;
  return pool.length ? pick(pool, rand).id : null;
}

/** A new threat and a new board, for the start of a turn. */
export function newBoard(state: HiveState, rand: Random = Math.random, rating?: number): HiveState {
  const threat = state.outcome ? null : chooseThreat(normalizeHive(state), rand);
  const next = { ...state, threat };
  return { ...next, board: state.outcome ? [] : generateBoard(next, rand, rating) };
}

export function generateBoard(state: HiveState, rand: Random = Math.random, rating?: number): HiveMission[] {
  state = normalizeHive(state);
  const base = budgetBase(state.turn, state.strength, rating);
  const reachable = reachableSectors(state.control, state.dark);
  const pool = [...reachable];
  const selected: SectorId[] = [];
  const take = (sector: SectorId) => { selected.push(sector); pool.splice(pool.indexOf(sector), 1); };
  // The announced threat always gets a mission when it can be reached.
  if (state.threat && pool.includes(state.threat)) take(state.threat);
  // A pending operation step is pinned in its sector.
  const pending = state.operation && state.operation.step === 2 && reachable.includes(state.operation.sector)
    ? state.operation : null;
  if (pending && !selected.includes(pending.sector) && pool.includes(pending.sector)) take(pending.sector);
  const size = 3 + ((state.assets ?? []).includes('informant') ? 1 : 0);
  while (pool.length && selected.length < size) take(pick(pool, rand));
  // From turn 2, with no operation running, one turn in three offers a new one in
  // a sector that is not theirs to lose (control 0 or lower), never the threatened one.
  let offer: { sector: SectorId; id: OperationId } | null = null;
  if (!state.operation && state.turn >= 2 && rand() < 1 / 3) {
    const candidates = selected.filter((sector) => sector !== state.threat && state.control[sector] <= 0);
    if (candidates.length) offer = { sector: pick(candidates, rand), id: pick(OPERATIONS, rand).id };
  }
  let defenceDrawn = false;
  const conditions = (Object.keys(CONDITIONS) as ConditionId[])
    .filter((id) => id !== 'nemesis-present' || state.nemesis.some((hero) => hero.isLeader && hero.status === 'active'));
  conditions.push('quiet');
  const board: HiveMission[] = selected.map((sector, index) => {
    const condition = pick(conditions, rand);
    const budget = missionBudget(state.turn, state.control[sector], condition, base) + actBonus(state.scheme!) + (state.vengeance ? 50 : 0);
    const id = `turn-${state.turn}-${index}-${sector}`;
    const operation = pending?.sector === sector ? { id: pending.id, step: 2 }
      : offer?.sector === sector ? { id: offer.id, step: 1 } : undefined;
    if (operation) {
      const steps = OPERATIONS.find((op) => op.id === operation.id)!.steps;
      return { id, sector, stake: 'raid' as const, scenarioId: steps[operation.step - 1], condition, budget, operation };
    }
    const defence = !defenceDrawn && state.control[sector] >= 1
      && (sector === state.threat || adjacentSectors(sector).some((other) => !state.dark!.includes(other) && state.control[other] <= -1));
    if (defence) defenceDrawn = true;
    return {
      id, sector,
      stake: defence ? 'defence' : 'raid',
      scenarioId: pick(scenariosData.scenarios, rand).id,
      condition,
      budget,
    };
  });
  if (state.clues === 8 && state.nemesis.some((hero) => hero.isLeader && hero.status === 'active')) {
    const sector = state.lastSeen!;
    if (!state.dark!.includes(sector)) {
      const reckoningBase = state.strength === 'matched' && rating ? rating + 150 : 500;
      board.push({
        id: `turn-${state.turn}-reckoning`, sector, stake: 'reckoning',
        scenarioId: pick(scenariosData.scenarios, rand).id,
        condition: 'nemesis-present',
        budget: Math.round((reckoningBase + 50 * state.scheme! + (state.vengeance ? 50 : 0)) / 25) * 25,
      });
    }
  }
  return board;
}

export function createHiveState(
  context: HiveContext,
  heroes: Pick<Warband['heroes'][number], 'unitType' | 'isLeader'>[],
  rand: Random = Math.random,
  strength: 'hive' | 'matched' = 'hive',
): HiveState {
  const control: HiveState['control'] = { spire: 0, 'hab-stacks': 0, wound: 0, refineries: 0, underhive: 1, sump: 0 };
  const lair = pick<SectorId>(['spire', 'wound', 'sump'], rand);
  control[lair] = -2;
  const nemesis: NemesisHero[] = [];
  heroes.forEach((hero, index) => {
    nemesis.push({
      id: `nemesis-${index}`,
      name: generateNemesisName(nemesis.map((other) => other.name), rand),
      role: hero.unitType,
      isLeader: hero.isLeader,
      status: 'active', battles: 0, timesDown: 0, scars: 0,
    });
  });
  const state: HiveState = {
    turn: 1, control, board: [], activeMissionId: null, nemesis, outcome: null,
    strength, assets: [], assetChoices: 1, operation: null,
    chronicle: [{
      turn: 1, kind: 'event', date: new Date().toISOString(),
      text: `${context.warband} made camp in the Underhive. ${nemesis.find((hero) => hero.isLeader)?.name ?? context.faction} of ${theFaction(context.faction)} holds ${sectorName(lair)}.`,
    }],
  };
  return normalizeHive(newBoard(state, rand, context.rating));
}

export function identifyNemesis(npc: Warband, state: HiveState, mission: HiveMission): Warband {
  state = normalizeHive(state);
  const active = state.nemesis.filter((hero) => hero.status === 'active' && !hero.isLeader);
  const leader = mission.condition === 'nemesis-present'
    ? state.nemesis.find((hero) => hero.status === 'active' && hero.isLeader) : undefined;
  let index = 0;
  return {
    ...npc,
    heroes: npc.heroes.map((hero) => {
      const identity = hero.isLeader ? leader : active[index++];
      if (identity) return { ...hero, id: identity.id, name: identity.name };
      return { ...hero, name: hero.isLeader ? `${hero.unitType}, acting leader` : hero.name };
    }),
  };
}

function clamp(value: number): number {
  return Math.max(-3, Math.min(3, value));
}

export function applyMissionControl(state: HiveState, mission: HiveMission, result: 'win' | 'loss' | 'draw', rand: Random = Math.random): HiveState['control'] {
  state = normalizeHive(state);
  const control = { ...state.control };
  if (mission.stake === 'reckoning') return control;
  let change = 0;
  // A lost raid costs no ground of its own: the nemesis already advances after
  // any turn without a win, and counting both made the map drift away from the
  // player by more than half a step a turn at an even win rate (playtest 2026-11-17).
  if (mission.stake === 'raid') change = result === 'win' ? (mission.condition === 'rich-seam' ? 2 : 1) : 0;
  else if (result === 'win') {
    const enemies = adjacentSectors(mission.sector).filter((id) => !state.dark!.includes(id) && control[id] <= -1);
    if (enemies.length) {
      const target = pick(enemies, rand);
      control[target] = clamp(control[target] + 1);
    }
  } else change = result === 'loss' ? ((state.assets ?? []).includes('safehouse') ? -1 : -2) : -1;
  control[mission.sector] = clamp(control[mission.sector] + change);
  return control;
}

/** Levels at +2 or more needed to win on the map: four, or three once a level
 *  has gone dark. Without that, the 2026-11-17 playtest found no map wins at all. */
export function levelsToWin(dark: SectorId[] = []): number {
  return dark.length > 0 ? 3 : 4;
}

export function checkOutcome(control: HiveState['control'], dark: SectorId[] = []): HiveState['outcome'] {
  const values = SECTORS.filter(({ id }) => !dark.includes(id)).map(({ id }) => control[id]);
  if (values.filter((value) => value >= 2).length >= levelsToWin(dark)) return 'won';
  if (values.filter((value) => value <= -2).length >= 4) return 'lost';
  return null;
}

export function outcomeText(outcome: 'won' | 'lost', context: HiveContext): string {
  return outcome === 'won'
    ? `The hive's levels answer to ${context.warband}. For now, Mord Hive is theirs.`
    : `${theFaction(context.faction, true)} hold the hive. ${context.warband} are hunted in it.`;
}

function entry(state: HiveState, kind: HiveChronicleEntry['kind'], text: string, sector?: SectorId): HiveChronicleEntry {
  return { turn: state.turn, kind, text, sector, date: new Date().toISOString() };
}

/** The hive's answer after a mission. A win holds the nemesis in place for the
 *  turn (`nemesisChecked`); after a draw or a loss it advances one sector. */
export function hiveMoves(
  state: HiveState,
  chosenId: string,
  context: HiveContext,
  rand: Random = Math.random,
  nemesisChecked = false,
  previousScheme = normalizeHive(state).scheme,
): HiveState {
  state = normalizeHive(state);
  const control = { ...state.control };
  const chronicle = [...state.chronicle];
  // An ignored defence in the threatened sector is not counted twice: the push itself is the cost.
  const ignoredDefences = state.board.filter((mission) => mission.id !== chosenId && mission.stake === 'defence' && mission.sector !== state.threat);
  ignoredDefences.forEach((mission) => {
    control[mission.sector] = clamp(control[mission.sector] - 1);
    chronicle.push(entry(state, 'ignored', `${sectorName(mission.sector)} was left to fend for itself.`, mission.sector));
  });
  const eligible = SECTORS.filter(({ id }) => !state.dark!.includes(id) && control[id] > -3);
  const adjacent = eligible.filter(({ id }) => adjacentSectors(id).some((other) => !state.dark!.includes(other) && control[other] <= -1));
  // Phase 6: with an announced threat, only a win in that sector stops the push.
  // Older turns without a threat keep the old rule (any win holds them).
  const chosen = state.board.find((mission) => mission.id === chosenId);
  const threat = state.threat && eligible.some(({ id }) => id === state.threat) ? SECTORS.find(({ id }) => id === state.threat)! : null;
  const repelled = !!threat && nemesisChecked && chosen?.sector === threat.id;
  const target = threat ? (repelled ? undefined : threat)
    : nemesisChecked ? undefined : pick(adjacent.length ? adjacent : eligible, rand);
  if (repelled) {
    chronicle.push(entry(state, 'nemesis', `${theFaction(context.faction, true)} came for ${threat!.name} and were thrown back. One of theirs talked on the way out.`, threat!.id));
  } else if (nemesisChecked && !threat) {
    chronicle.push(entry(state, 'nemesis', `${theFaction(context.faction, true)} gained no ground this turn.`));
  }
  if (target) {
    control[target.id] = clamp(control[target.id] - 1);
    const leader = state.nemesis.find((hero) => hero.isLeader && hero.status === 'active');
    const text = threat && nemesisChecked
      ? `While ${context.warband} fought elsewhere, ${theFaction(context.faction)} took their step into ${target.name}.`
      : pick([
        `${theFaction(context.faction, true)} pushed into ${target.name}.`,
        `${leader?.name ?? context.faction}'s people were seen in ${target.name}.`,
      ], rand);
    chronicle.push(entry(state, 'nemesis', text, target.id));
  }
  const event = rollHiveEvent(rand);
  chronicle.push(entry(state, 'event', `Hive event ${event.roll} (flavour only): ${event.text}`));
  const ignored = ignoredDefences.length;
  const scheme = Math.min(12, state.scheme! + (nemesisChecked ? 0 : 1) + ignored);
  let next: HiveState = normalizeHive({
    ...state, control, chronicle, scheme, lastSeen: target?.id ?? state.lastSeen,
    turn: state.turn + 1, activeMissionId: null,
  });
  // Throwing back the announced push is worth a clue, on top of the battle's own
  // (compensation measured 2026-11-17: without it, campaign wins fell 8 points).
  if (repelled) next = gainClues(next, 1, context.agenda);
  if (next.turn === 4 || next.turn === 8) {
    // A sector with an operation waiting in it does not go dark.
    const candidates = SECTORS.filter(({ id }) => id !== 'underhive' && id !== next.operation?.sector
      && !next.dark!.includes(id) && Math.abs(control[id]) <= 1);
    if (candidates.length) {
      const sector = pick(candidates, rand);
      next.dark = [...next.dark!, sector.id];
      next.chronicle.push(entry(next, 'event', `${sector.name} went dark. Nobody holds it now.`, sector.id));
      if (next.lastSeen === sector.id) {
        next.lastSeen = SECTORS.filter(({ id }) => !next.dark!.includes(id))
          .sort((a, b) => control[a.id] - control[b.id])[0].id;
      }
    }
  }
  next = finishTurn(next, previousScheme, context);
  return { ...newBoard(next, rand, context.rating), vengeance: false };

}

export function resolveMission(
  state: HiveState,
  missionId: string,
  result: 'win' | 'loss' | 'draw',
  context: HiveContext,
  participatingIds: string[] = [],
  downIds: string[] = [],
  rand: Random = Math.random,
  lead = false,
  extraClue = false,
): HiveState {
  state = normalizeHive(state);
  const mission = state.board.find((item) => item.id === missionId);
  if (!mission || state.activeMissionId !== missionId || state.outcome) return state;
  const casualtyLines: string[] = [];
  const nemesis = state.nemesis.map((hero) => {
    if (hero.status !== 'active' || !participatingIds.includes(hero.id)) return { ...hero };
    const next = { ...hero, battles: hero.battles + 1 };
    if (downIds.includes(hero.id)) {
      next.timesDown += 1;
      casualtyLines.push(`${hero.name} was carried from the fight.`);
      const roll = 1 + Math.floor(rand() * 6);
      if (roll === 1) {
        next.status = 'dead';
        casualtyLines.push(`${hero.name} did not get up again.`);
      } else if (roll <= 3) {
        next.scars += 1;
        casualtyLines.push(`${hero.name} will carry the mark.`);
      } else if (result === 'win' && 1 + Math.floor(rand() * 6) >= 5) {
        next.status = 'captured';
        casualtyLines.push(`${hero.name} was taken alive.`);
      }
    }
    return next;
  });
  if (!nemesis.some((hero) => hero.isLeader && hero.status === 'active')) {
    nemesis.filter((hero) => hero.status === 'captured').forEach((hero) => {
      hero.isLeader = false;
    });
    const successor = nemesis.find((hero) => hero.status === 'active');
    if (successor) successor.isLeader = true;
    else {
      nemesis.push({
        id: `nemesis-${nemesis.length}`,
        name: generateNemesisName(nemesis.map((hero) => hero.name), rand),
        role: state.nemesis.find((hero) => hero.isLeader)?.role ?? '',
        isLeader: true, status: 'active', battles: 0, timesDown: 0, scars: 0,
      });
    }
  }
  const sector = sectorName(mission.sector);
  const scenario = scenarioName(mission.scenarioId);
  const opening = pick([
    `Turn ${state.turn}. ${sector}: ${context.warband} went in after ${scenario}.`,
    `Turn ${state.turn}. ${context.warband} fought ${theFaction(context.faction)} in ${sector} (${scenario}).`,
    `Turn ${state.turn}. ${sector}, ${CONDITIONS[mission.condition].name}. ${context.warband} against ${theFaction(context.faction)}.`,
  ], rand);
  const results = {
    win: ['They held the field.', `${theFaction(context.faction, true)} broke first.`, `It cost them, but ${sector} is quieter tonight.`],
    loss: ['They were driven back to camp.', `${theFaction(context.faction, true)} kept the ground.`, 'Nobody talks about how it ended.'],
    draw: ['Neither side could finish it.', 'Both pulled back before the lamps ran dry.'],
  };
  const text = [opening, pick(results[result], rand), ...casualtyLines].join(' ');
  const leader = state.nemesis.find((hero) => hero.isLeader && hero.status === 'active');
  // At most two clues per battle (lead, win and heroes taken down together), so the
  // Reckoning does not open after three or four battles.
  const heroesDown = Math.min(2, state.nemesis.filter((hero) =>
    hero.status === 'active' && participatingIds.includes(hero.id) && downIds.includes(hero.id)).length);
  let next = gainClues({ ...state, nemesis },
    Math.min(2, (lead ? 1 : 0) + (result === 'win' ? 1 : 0) + heroesDown) + (extraClue && result === 'win' ? 1 : 0), context.agenda);
  if (mission.stake === 'reckoning' && result === 'win') {
    // The Reckoning ends the leader for good, so the list of known enemies agrees with the chronicle.
    const fallen = next.nemesis.map((hero) => (hero.isLeader && hero.status === 'active' ? { ...hero, status: 'dead' as const } : hero));
    return {
      ...next, nemesis: fallen, outcome: 'won', activeMissionId: null, board: [],
      chronicle: [...next.chronicle, entry(next, 'outcome', `${leader?.name ?? context.faction} is finished. The scheme dies with them.`)],
    };
  }
  if (mission.stake === 'reckoning' && result === 'loss') {
    next = { ...next, clues: Math.max(0, next.clues! - 2), scheme: Math.min(12, next.scheme! + 2), reckoningLosses: next.reckoningLosses! + 1 };
  }
  if (mission.stake === 'defence' && result === 'loss') {
    next = { ...next, scheme: Math.min(12, next.scheme! + 1) };
  }
  next = advanceOperation(next, mission, result);
  return hiveMoves({
    ...next, nemesis,
    control: applyMissionControl(state, mission, result, rand),
    chronicle: [...next.chronicle, entry(state, 'battle', text, mission.sector)],
  }, missionId, context, rand, result === 'win', state.scheme!);
}

export function abandonMission(state: HiveState, context: HiveContext, rand: Random = Math.random): HiveState {
  state = normalizeHive(state);
  return state.activeMissionId ? resolveMission(state, state.activeMissionId, 'loss', context, [], [], rand) : state;
}

export function controlLabel(value: number): string {
  return ['Their stronghold', 'Firmly theirs', 'Theirs', 'Contested', 'Yours', 'Firmly yours', 'Your stronghold'][value + 3];
}

export function normalizeHive(state: HiveState) {
  const dark = state.dark ?? [];
  return {
    ...state,
    clues: Math.max(0, Math.min(8, state.clues ?? 0)),
    scheme: Math.max(0, Math.min(12, state.scheme ?? 0)),
    lastSeen: state.lastSeen ?? SECTORS.filter(({ id }) => !dark.includes(id))
      .sort((a, b) => state.control[a.id] - state.control[b.id])[0].id,
    dark,
    vengeance: state.vengeance ?? false,
    reckoningLosses: state.reckoningLosses ?? 0,
    strength: state.strength ?? 'hive',
    threat: state.threat ?? null,
    operation: state.operation ?? null,
    assets: state.assets ?? [],
    assetChoices: state.assetChoices ?? 0,
    cutoutsUsed: state.cutoutsUsed ?? false,
  };
}

export function actBonus(scheme: number): number {
  return scheme >= 8 ? 100 : scheme >= 4 ? 50 : 0;
}

export function dossierEntries(agenda: CampaignAgenda, clues: number) {
  return [
    { name: 'The rumour', needed: 1, text: `${agenda.title}: ${agenda.premise}` },
    { name: 'First move', needed: 3, text: agenda.actGoals[0] },
    { name: 'Second move', needed: 5, text: agenda.actGoals[1] },
    { name: 'Final move', needed: 7, text: agenda.actGoals[2] },
    { name: 'What they want', needed: 8, text: agenda.victory },
  ].map((item) => ({ ...item, open: clues >= item.needed }));
}

export function gainClues(state: HiveState, amount: number, agenda?: CampaignAgenda): HiveState {
  const next = normalizeHive(state);
  next.clues = Math.min(8, next.clues + amount);
  next.chronicle = [...next.chronicle];
  if (agenda) {
    dossierEntries(agenda, next.clues).filter((item) => item.open && item.needed > (state.clues ?? 0))
      .forEach((item) => next.chronicle.push(entry(next, 'event', `A clue: ${item.name} is known now.`)));
  }
  return next;
}

function finishTurn(state: HiveState, previousScheme: number, context: HiveContext): HiveState {
  const next = normalizeHive(state);
  next.chronicle = [...next.chronicle];
  [4, 8].filter((threshold) => previousScheme < threshold && next.scheme >= threshold)
    .forEach(() => next.chronicle.push(entry(next, 'event', `${theFaction(context.faction, true)} move to their next step.`)));
  next.outcome = next.scheme >= 12 ? 'lost' : checkOutcome(next.control, next.dark);
  if (next.outcome) {
    const text = next.scheme >= 12
      ? `The scheme is complete. ${context.agenda?.victory ?? ''}`
      : outcomeText(next.outcome, context);
    next.chronicle.push(entry(next, 'outcome', text));
  }
  return next;
}

export type PrisonerAction = 'interrogate' | 'trade' | 'example';

export function prisonerAction(state: HiveState, id: string, action: PrisonerAction, context: HiveContext, rand: Random = Math.random): HiveState {
  let next: HiveState = normalizeHive(state);
  const prisoner = next.nemesis.find((hero) => hero.id === id && hero.status === 'captured');
  if (!prisoner || next.outcome || next.activeMissionId) return next;
  next = { ...next, nemesis: next.nemesis.map((hero) => ({ ...hero })), control: { ...next.control }, chronicle: [...next.chronicle] };
  const hero = next.nemesis.find((item) => item.id === id)!;
  hero.isLeader = false;
  hero.status = action === 'example' ? 'dead' : 'active';
  let text: string;
  if (action === 'interrogate') {
    hero.grudge = true;
    next = gainClues(next, 2, context.agenda);
    text = `${hero.name} talked, then slipped the chains.`;
  } else if (action === 'trade') {
    const eligible = SECTORS.filter(({ id: sector }) => !next.dark!.includes(sector));
    const enemies = eligible.filter(({ id: sector }) => next.control[sector] <= -1);
    const sector = enemies.length ? pick(enemies, rand) : [...eligible].sort((a, b) => next.control[a.id] - next.control[b.id])[0];
    next.control[sector.id] = clamp(next.control[sector.id] + 1);
    text = `${hero.name} was traded for ground in ${sector.name}.`;
  } else {
    next.vengeance = true;
    text = `${hero.name} was made an example of. ${theFaction(context.faction, true)} will answer.`;
  }
  next.chronicle.push(entry(next, 'event', text));
  next = finishTurn(next, next.scheme!, context);
  // A prisoner action does not start a new turn, so the announced threat stays.
  return { ...next, board: next.outcome ? [] : generateBoard(next, rand, context.rating), vengeance: false };
}

/** Phase 6 operations: a won first step pins the second; a won second step earns
 *  an asset choice; anything else ends the operation. */
function advanceOperation(state: HiveState, mission: HiveMission, result: 'win' | 'loss' | 'draw'): HiveState {
  const chronicle = [...state.chronicle];
  let operation = state.operation ?? null;
  let assetChoices = state.assetChoices ?? 0;
  if (operation && mission.operation?.id !== operation.id) {
    chronicle.push(entry(state, 'event', `${operationName(operation.id)} was dropped.`));
    operation = null;
  }
  if (mission.operation) {
    const name = operationName(mission.operation.id);
    if (result !== 'win') {
      chronicle.push(entry(state, 'event', `${name} failed.`));
      operation = null;
    } else if (mission.operation.step === 1) {
      chronicle.push(entry(state, 'event', `${name}: the first part is done. The second waits in ${sectorName(mission.sector)}.`));
      operation = { id: mission.operation.id, sector: mission.sector, step: 2 };
    } else {
      operation = null;
      const left = ASSETS.length - (state.assets ?? []).length - assetChoices;
      if (left > 0) assetChoices += 1;
      chronicle.push(entry(state, 'event', `${name} is complete.${left > 0 ? ' Choose an asset.' : ''}`));
    }
  }
  return { ...state, operation, assetChoices, chronicle };
}

export function chooseAsset(state: HiveState, id: AssetId): HiveState {
  const next = normalizeHive(state);
  if (next.assetChoices <= 0 || next.assets.includes(id)) return next;
  const asset = ASSETS.find((item) => item.id === id)!;
  return {
    ...next, assets: [...next.assets, id], assetChoices: next.assetChoices - 1,
    chronicle: [...next.chronicle, entry(next, 'event', `Asset gained: ${asset.name}.`)],
  };
}

export function applyCutouts(state: HiveState): HiveState {
  const next = normalizeHive(state);
  if (!next.assets.includes('cut-outs') || next.cutoutsUsed || next.outcome) return next;
  return {
    ...next, scheme: Math.max(0, next.scheme - 2), cutoutsUsed: true,
    chronicle: [...next.chronicle, entry(next, 'event', 'The cut-outs fed them a false trail. Their plan slipped back.')],
  };
}
