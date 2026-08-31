// A solo oracle — the dice helper a player consults for the questions the app
// can't model when there's no opponent to decide them: does the enemy hold or
// push, what does a neutral do, what fresh hell the hive throws up. App-original
// (spec §6), themed to Mord Hive, never presented as ruleset content.

const d6 = () => 1 + Math.floor(Math.random() * 6);
const d66 = () => `${d6()}${d6()}`;

// --- Yes / No with likelihood ---

export type Likelihood = 'certain' | 'likely' | 'fifty' | 'unlikely' | 'noWay';

export const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  certain: 'Almost certain',
  likely: 'Likely',
  fifty: '50 / 50',
  unlikely: 'Unlikely',
  noWay: 'No way',
};

// The D6 a "yes" needs to reach, per likelihood.
const THRESHOLDS: Record<Likelihood, number> = {
  certain: 2,
  likely: 3,
  fifty: 4,
  unlikely: 5,
  noWay: 6,
};

export type OracleAnswer = { roll: number; text: string };

/** Rolls a D6 against the likelihood. A natural 6 sweetens a yes ("and"), a
 * natural 1 sours it ("but"/"and") — the classic solo-oracle twist. */
export function askYesNo(likelihood: Likelihood): OracleAnswer {
  const roll = d6();
  const yes = roll >= THRESHOLDS[likelihood];
  let text: string;
  if (roll === 6) text = 'Yes, and — better than hoped.';
  else if (roll === 1) text = yes ? 'Yes, but — at a cost.' : 'No, and — worse than feared.';
  else text = yes ? 'Yes.' : 'No.';
  return { roll, text };
}

// --- Reaction (2D6) — how a neutral or wavering force responds ---

export type ReactionResult = { roll: number; label: string; text: string };

export function rollReaction(): ReactionResult {
  const roll = d6() + d6();
  let label: string;
  let text: string;
  if (roll === 2) { label = 'Hostile'; text = 'It turns on you — treat as an immediate threat.'; }
  else if (roll <= 5) { label = 'Wary'; text = 'Suspicious and defensive; it keeps its distance and its weapons ready.'; }
  else if (roll <= 8) { label = 'Neutral'; text = 'Indifferent — it goes about its own business unless pressed.'; }
  else if (roll <= 11) { label = 'Cautiously Open'; text = 'Willing to talk or trade, for the right price or threat.'; }
  else { label = 'Helpful'; text = 'It throws in with you, at least for now.'; }
  return { roll, label, text };
}

// --- Random hive event / complication (D66) ---

export type HiveEvent = { roll: string; text: string };

const HIVE_EVENTS: { min: number; max: number; text: string }[] = [
  { min: 11, max: 13, text: 'A structural groan — a floor or walkway gives way. The nearest model tests Initiative or falls.' },
  { min: 14, max: 16, text: 'Toxic gas vents from a ruptured pipe; a random model chokes (treat as a Strength 2 hit, no armour).' },
  { min: 21, max: 23, text: 'A glint of refined diamantine catches the light — place a shard counter in a random ruin.' },
  { min: 24, max: 26, text: 'Distant gunfire draws attention; every model must pass a nerve check or hold this turn.' },
  { min: 31, max: 33, text: 'Flickering lumen-strips plunge an area into darkness — halve sight lines there this turn.' },
  { min: 34, max: 36, text: 'A lone, desperate survivor stumbles into the open. Roll a Reaction for them.' },
  { min: 41, max: 43, text: 'Rival scavengers are heard closing in — an off-table threat that will arrive if the game runs long.' },
  { min: 44, max: 46, text: 'A cache of ammunition is spotted — the first model to reach it re-rolls failed shooting next turn.' },
  { min: 51, max: 53, text: 'Vermin swarm from the vents, harassing the nearest model (−1 to hit next turn).' },
  { min: 54, max: 56, text: 'A tremor runs through the hive — all models are knocked off balance; no running next turn.' },
  { min: 61, max: 63, text: 'Emergency bulkheads slam shut, sealing a passage — block a random board edge or opening.' },
  { min: 64, max: 66, text: 'An eerie calm. Nothing happens — but everyone feels watched.' },
];

export function rollHiveEvent(): HiveEvent {
  const roll = d66();
  const n = parseInt(roll, 10);
  const entry = HIVE_EVENTS.find((e) => n >= e.min && n <= e.max) ?? HIVE_EVENTS[HIVE_EVENTS.length - 1];
  return { roll, text: entry.text };
}
