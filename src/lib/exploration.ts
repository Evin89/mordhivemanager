import explorationData from '../data/exploration.json';

// Exploration logic (Mord Hive v0.5 Income phase). The app resolves the dice
// mechanics — pool, keep-6, multiples, shards-from-total — and surfaces the
// found location's effect text; it does NOT auto-apply location loot (almost all
// of it is dice/conditional/choice), matching Mordheim Manager's conservative
// rule. Only the flat shards read off the total are applied automatically.

export type ExplorationLocation = {
  id: string;
  kind: string;
  face: number;
  count: number;
  combination: string;
  name: string;
  effect: string;
};

export const MAX_DICE_KEPT = explorationData.procedure.maxDiceKept;

const d6 = () => 1 + Math.floor(Math.random() * 6);

export function rollDice(n: number): number[] {
  return Array.from({ length: Math.max(0, n) }, d6);
}

/** The six dice that count: the highest MAX_DICE_KEPT of those rolled. */
export function keptDice(dice: number[]): number[] {
  return [...dice].sort((a, b) => b - a).slice(0, MAX_DICE_KEPT);
}

export function shardsForTotal(total: number): number {
  const row = explorationData.shardsFound.find((r) => total >= r.min && (r.max === null || total <= r.max));
  return row ? row.shards : 0;
}

/**
 * The location found, if any. The rules: pick the most numerous set of matching
 * faces; ties break to the highest face. A 1-2-3-4-5-6 across six kept dice is
 * the Hand of Fate. Returns undefined when there are no multiples.
 */
export function findLocation(kept: number[]): ExplorationLocation | undefined {
  // Hand of Fate: exactly one of each face across six kept dice.
  if (kept.length === MAX_DICE_KEPT && new Set(kept).size === 6) {
    return { id: 'hand-of-fate', kind: 'imperialFlush', face: 0, count: 6, ...explorationData.handOfFate };
  }

  const counts = new Map<number, number>();
  for (const face of kept) counts.set(face, (counts.get(face) ?? 0) + 1);

  let best: { face: number; count: number } | null = null;
  for (const [face, count] of counts) {
    if (count < 2) continue;
    if (!best || count > best.count || (count === best.count && face > best.face)) {
      best = { face, count };
    }
  }
  if (!best) return undefined;

  // The chart tops out at six-of-a-kind; a larger match (only possible with >6
  // rolled, but we key off kept) is clamped to the six-of-a-kind entry.
  const count = Math.min(best.count, 6);
  return explorationData.chart.find((l) => l.face === best!.face && l.count === count) as ExplorationLocation | undefined;
}

export type ExplorationOutcome = {
  kept: number[];
  total: number;
  shards: number;
  location: ExplorationLocation | undefined;
};

export function resolveExploration(dice: number[]): ExplorationOutcome {
  const kept = keptDice(dice);
  const total = kept.reduce((s, n) => s + n, 0);
  return { kept, total, shards: shardsForTotal(total), location: findLocation(kept) };
}
