import { StatLine } from '../types';

// PLACEHOLDER — NOT SOURCED. These numbers exist only to exercise the datasheet
// layout in the design sandbox. Per the §8 sourcing hard line, no statline is
// ever invented from memory and presented as real: this file is loudly flagged,
// lives outside the real `data/` content set, and is shown in the sandbox behind
// a "not sourced from v0.5" designer's note. Real gang data arrives via the
// converter (§3, build step 5) from the Mord Hive v0.5 ruleset.

export const PLACEHOLDER = true;

export type SampleUnit = {
  name: string;
  subtitle: string;
  stats: StatLine;
  maximums: StatLine;
  wargear: string;
};

export const sampleUnits: SampleUnit[] = [
  {
    name: 'Placeholder Leader',
    subtitle: 'Leader · sample — not sourced',
    stats: { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    maximums: { M: 4, WS: 6, BS: 6, S: 4, T: 4, W: 3, I: 6, A: 4, Ld: 9 },
    wargear: 'Sample wargear line — a close-combat weapon and a ranged weapon (placeholder).',
  },
  {
    name: 'Placeholder Warrior',
    subtitle: 'Henchman · sample — not sourced',
    stats: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    maximums: { M: 4, WS: 6, BS: 6, S: 4, T: 4, W: 3, I: 6, A: 4, Ld: 9 },
    wargear: 'Sample wargear line (placeholder).',
  },
];
