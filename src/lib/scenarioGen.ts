import data from '../data/scenarios.json';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SetupRoll = { label: string; dice: number[]; modifier: number; value: number };
export function rollScenario(rand: () => number, { includeBonus = false } = {}) {
 const dice: [number, number] = [1 + Math.floor(rand()*6), 1 + Math.floor(rand()*6)];
 const total = dice[0]+dice[1];
 return { dice, total, scenarioId: data.rollTable.find(r=>r.roll===total)!.scenario, choices: data.scenarios.filter(s=>includeBonus || !('bonus' in s)).map(s=>s.id) };
}
export function scenarioSetupRolls(rand: () => number, scenarioId: string): SetupRoll[] {
 const roll = (label: string, modifier = 0): SetupRoll => { const dice = [1 + Math.floor(rand()*3)]; return {label, dice, modifier, value: dice[0]+modifier}; };
 switch(scenarioId) {
 case 'diamantine-hunt': return [roll('Diamantine counters',1)];
 case 'occupy': return [roll('Objective buildings',2)];
 case 'chance-encounter': return [roll('Warband A shards'),roll('Warband B shards')];
 default: return [];
 }
}
