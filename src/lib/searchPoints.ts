import type { BattleSession } from '../store/battle';
import { generateBattlefield } from './battlefield';
import scenarios from '../data/scenarios.json';
import { findSoloScenario } from './soloScenarios';
import { changeAlarm } from './alarmEvents';
import { revealContacts } from './battleEncounters';
import { generateId } from './id';

export type SearchPoint = { n: number; x: number; y: number; searched: boolean; result: string | null };

export function prepareSearchPoints(s: BattleSession): BattleSession {
  if (!s.searchEnabled || !s.npcWarband || s.started || s.searchPoints.length) return s;
  const seed = s.battlefieldSeed ?? Math.floor(Math.random() * 4294967296);
  const scenarioId = findSoloScenario(s.scenario)?.mapBase ?? scenarios.scenarios.find(d => d.name === s.scenario)?.id ?? '';
  const field = generateBattlefield(seed, scenarioId);
  const searchPoints = field.buildings.slice(0, 4).map((b, i) => ({
    n: i + 1, x: b.x + b.w / 2, y: b.y + b.h / 2, searched: false, result: null,
  }));
  return { ...s, battlefieldSeed: seed, searchPoints };
}

export function searchPoint(s: BattleSession, n: number, roll = 1 + Math.floor(Math.random() * 6)): BattleSession {
  const point = s.searchPoints.find(p => p.n === n);
  if (!s.searchEnabled || !point || point.searched) return s;
  let next = s;
  let result: string;
  if (roll === 1) {
    result = 'You knocked something over.';
    next = changeAlarm(s, 1);
  } else if (roll <= 3) {
    result = 'Nothing but dust.';
  } else if (roll <= 5) {
    result = 'Tracks.';
    const hidden = s.hiddenContacts ? s.contacts.filter(c => !c.revealed) : [];
    next = hidden.length ? revealContacts(s, hidden[Math.floor(Math.random() * hidden.length)].letter) : changeAlarm(s, -1);
  } else {
    result = 'A lead.';
    next = s.soloMission ? { ...s, lead: true } : changeAlarm(s, -2);
  }
  return {
    ...next,
    searchPoints: next.searchPoints.map(p => p.n === n ? { ...p, searched: true, result } : p),
    events: [{ id: generateId(), turn: s.turn, text: `Search point ${n} — D6 ${roll}: ${result}` }, ...next.events],
  };
}
