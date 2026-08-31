// A generated battlefield for a solo scenario (spec §6: "generated scenario +
// SVG map"). Deterministic from a seed so it survives reloads and can be
// re-rolled; laid out to the scenario's own shape (deployment edges, a central
// objective, scattered diamantine). App-original terrain suggestion, not a
// prescribed board — move the pieces to fit the table you actually own.

export type Rect = { x: number; y: number; w: number; h: number };
export type Marker = { x: number; y: number; label: string; kind: 'objective' | 'diamantine' };
export type Zone = { label: string; x: number; y: number; w: number; h: number };

export type Battlefield = {
  size: number; // board is size×size units (a nominal 4'×4')
  buildings: Rect[];
  markers: Marker[];
  zones: Zone[];
  seed: number;
};

/** mulberry32 — a tiny seeded PRNG, so a given seed always draws the same board. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const overlaps = (a: Rect, b: Rect, pad = 3) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

const centralScenarios = new Set(['defend-the-find', 'occupy']);
const shardScenarios = new Set(['skirmish', 'diamantine-hunt', 'hidden-treasure']);

export function generateBattlefield(seed: number, scenarioId: string): Battlefield {
  const rand = rng(seed);
  const size = 100;
  const margin = 6;
  const buildings: Rect[] = [];

  // Scatter ruined blocks, rejecting placements that pile onto another.
  const target = 8 + Math.floor(rand() * 4); // 8–11
  let attempts = 0;
  while (buildings.length < target && attempts < 200) {
    attempts += 1;
    const w = 10 + Math.floor(rand() * 16); // 10–25
    const h = 10 + Math.floor(rand() * 16);
    const x = margin + Math.floor(rand() * (size - 2 * margin - w));
    const y = margin + Math.floor(rand() * (size - 2 * margin - h));
    const rect = { x, y, w, h };
    // Keep the very centre clear for a central-objective scenario.
    if (centralScenarios.has(scenarioId) && overlaps(rect, { x: 40, y: 40, w: 20, h: 20 }, 0)) continue;
    if (buildings.some((b) => overlaps(rect, b))) continue;
    buildings.push(rect);
  }

  // Objective / diamantine markers.
  const markers: Marker[] = [];
  if (centralScenarios.has(scenarioId)) {
    markers.push({ x: 50, y: 50, label: 'Objective', kind: 'objective' });
  }
  if (shardScenarios.has(scenarioId)) {
    const shards = 3 + Math.floor(rand() * 2); // D3+1-ish: 3–4
    for (let i = 0; i < shards; i++) {
      markers.push({
        x: margin + Math.floor(rand() * (size - 2 * margin)),
        y: margin + Math.floor(rand() * (size - 2 * margin)),
        label: 'Diamantine',
        kind: 'diamantine',
      });
    }
  }

  // Deployment zones: opposite edges by default; the defender holds the centre
  // in Defend the Find.
  const zones: Zone[] =
    scenarioId === 'defend-the-find'
      ? [
          { label: 'Defender (within 6" of the objective)', x: 35, y: 35, w: 30, h: 30 },
          { label: 'Attacker (any table edge)', x: 0, y: 0, w: size, h: 8 },
        ]
      : [
          { label: 'Deployment A', x: 0, y: 0, w: size, h: 10 },
          { label: 'Deployment B', x: 0, y: size - 10, w: size, h: 10 },
        ];

  return { size, buildings, markers, zones, seed };
}
