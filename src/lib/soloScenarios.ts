import type { BattleSession } from '../store/battle';
import type { Warband } from '../types';
import { countModels } from './rating';
import { generateBattlefield } from './battlefield';
import { changeAlarm } from './alarmEvents';
import { generateId } from './id';

export type SoloScenarioState = {
  id: string;
  trackers: Record<string, boolean | number>;
  exitEdge?: string;
  captiveHeroId?: string;
  outcome: 'won' | 'lost' | null;
};
export const soloScenarios = [
  {
    "id": "solo-hunt",
    "name": "The Hunt",
    "briefing": "Something has made this block its own. Find it before it finds you.",
    "setup": [
      "Hidden contacts are on for this battle, with four echoes instead of two.",
      "The enemy leader is the quarry.",
      "You have until the end of turn 10."
    ],
    "special": [],
    "win": "Take the quarry out of action.",
    "lose": "Turn 10 ends, or you rout.",
    "mapBase": "skirmish",
    "trackers": [],
    "turnLimit": 10
  },
  {
    "id": "solo-break-in",
    "name": "The Break-in",
    "briefing": "In, take it, out. Nobody needs to know you were here.",
    "setup": [
      "The alarm starts at 0. While it stays at 0, the enemy does not activate.",
      "A vault stands at the central objective. From turn 2, a hero of yours who ends a turn in contact with it, not in combat, opens it. Opening it raises the alarm by 2.",
      "The hero who opened it carries the take and must leave by your table edge."
    ],
    "special": [],
    "win": "Open the vault and get the carrier off by your table edge.",
    "lose": "The carrier is taken out of action, or you rout.",
    "mapBase": "defend-the-find",
    "trackers": [
      "Vault opened",
      "Carrier left by your table edge"
    ],
    "turnLimit": null
  },
  {
    "id": "solo-hold",
    "name": "Hold the Line",
    "briefing": "They are coming up from below. Hold until the lamps are relit.",
    "setup": [
      "You deploy within 6\" of the central objective. The enemy deploys on any table edge.",
      "From turn 2 the alarm is locked at 8: nothing changes it, two reinforcements arrive every turn, and twice as many can arrive in total."
    ],
    "special": [],
    "win": "When turn 8 begins, a hero of yours still holds the objective.",
    "lose": "The objective is lost, or you rout.",
    "mapBase": "defend-the-find",
    "trackers": [
      "A hero still holds the objective"
    ],
    "turnLimit": 8
  },
  {
    "id": "solo-way-out",
    "name": "The Way Out",
    "briefing": "The block is surrounded. One way is still open.",
    "setup": [
      "You deploy in the centre. The enemy deploys on all edges.",
      "The app picks the exit edge at the start. When turn 4 begins the route is blocked and the app picks again (it may be the same edge).",
      "Count each model of yours that leaves by the exit edge."
    ],
    "special": [],
    "win": "More than half of your starting models leave by the exit.",
    "lose": "You rout, or too many of your models are out of action to reach that number.",
    "mapBase": "skirmish",
    "trackers": [],
    "turnLimit": null
  },
  {
    "id": "solo-sabotage",
    "name": "Sabotage",
    "briefing": "Three machines keep this level alive. Stop them.",
    "setup": [
      "The map marks three targets on three buildings.",
      "A model of yours that ends a turn in contact with a target, not in combat, destroys it. Each one raises the alarm by 2.",
      "You have until the end of turn 10."
    ],
    "special": [],
    "win": "Destroy all three targets.",
    "lose": "Turn 10 ends, or you rout.",
    "mapBase": "occupy",
    "trackers": [
      "Target 1 destroyed",
      "Target 2 destroyed",
      "Target 3 destroyed"
    ],
    "turnLimit": 10
  },
  {
    "id": "solo-rescue",
    "name": "The Rescue",
    "briefing": "They took one of yours. Bring them home.",
    "setup": [
      "One of your heroes is held at the central objective and is not deployed.",
      "A model of yours that reaches the captive, not in combat, frees them. Once freed they fight with their normal profile and wargear.",
      "The freed captive must leave by your table edge."
    ],
    "special": [],
    "win": "Free the captive and get them off by your table edge.",
    "lose": "You rout. Nothing happens to the captive on the roster either way.",
    "mapBase": "defend-the-find",
    "trackers": [
      "Captive freed",
      "Captive left by your table edge"
    ],
    "turnLimit": null
  }
];
export const findSoloScenario = (name: string) => soloScenarios.find(s => s.name === name);
export const rollExit = () => ['top', 'right', 'bottom', 'left'][Math.floor(Math.random() * 4)];
export const neededToEscape = (warband: Warband) => Math.floor(countModels(warband) / 2) + 1;

export function battleField(s: BattleSession) {
  const solo = findSoloScenario(s.scenario);
  const field = generateBattlefield(s.battlefieldSeed ?? 0, solo?.mapBase ?? '', solo?.id === 'solo-sabotage' ? { buildings: 3 } : undefined);
  if (solo?.id === 'solo-sabotage') {
    field.markers.forEach((m, i) => { m.label = `Target ${i + 1}`; });
  }
  return field;
}

export function startSolo(s: BattleSession): BattleSession {
  const def = findSoloScenario(s.scenario);
  if (!def || s.started) return s;
  return {
    ...s,
    battlefieldSeed: s.battlefieldSeed ?? Math.floor(Math.random() * 4294967296),
    hiddenContacts: def.id === 'solo-hunt' || s.hiddenContacts,
    alarmEnabled: ['solo-break-in', 'solo-hold', 'solo-sabotage'].includes(def.id) || s.alarmEnabled,
    alarm: def.id === 'solo-break-in' ? 0 : s.alarm,
    soloScenario: { id: def.id, trackers: {}, outcome: null, captiveHeroId: s.soloScenario?.captiveHeroId, exitEdge: def.id === 'solo-way-out' ? rollExit() : undefined },
  };
}

export function evaluateObjective(s: BattleSession, warband: Warband): BattleSession {
  const state = s.soloScenario;
  const def = findSoloScenario(s.scenario);
  if (!state || !def || state.outcome) return s;
  const t = state.trackers;
  const escaped = Number(t.escaped ?? 0);
  const casualties = s.outOfAction.heroIds.length + Object.values(s.outOfAction.henchmenCounts).reduce((a, b) => a + b, 0);
  const leader = s.npcWarband?.heroes.find(h => h.isLeader);
  const won = def.id === 'solo-hunt' ? !!leader && s.npcOutOfAction.heroIds.includes(leader.id)
    : def.id === 'solo-way-out' ? escaped >= neededToEscape(warband)
    : def.trackers.length > 0 && def.trackers.every(label => !!t[label]);
  const lost = !!t.routed || !!t.failed
    || (['solo-hunt', 'solo-sabotage'].includes(def.id) && s.turn > 10)
    || (def.id === 'solo-way-out' && countModels(warband) - casualties < neededToEscape(warband));
  const outcome = lost ? 'lost' : won ? 'won' : null;
  return outcome ? { ...s, soloScenario: { ...state, outcome }, result: outcome === 'won' ? 'win' : 'loss' } : s;
}

export function advanceSolo(s: BattleSession): BattleSession {
  if (!s.soloScenario) return s;
  if (s.soloScenario.id === 'solo-hold' && s.turn >= 2) return { ...s, alarm: 8, alarmEnabled: true };
  if (s.soloScenario.id !== 'solo-way-out' || s.turn !== 4 || s.soloScenario.trackers.routeRerolled) return s;
  const edge = rollExit();
  return { ...s, soloScenario: { ...s.soloScenario, exitEdge: edge, trackers: { ...s.soloScenario.trackers, routeRerolled: true } }, events: [{ id: generateId(), turn: s.turn, text: `The route is blocked. New way out: ${edge}.` }, ...s.events] };
}

export function trackObjective(s: BattleSession, key: string, value: boolean | number): BattleSession {
  if (!s.soloScenario || s.soloScenario.outcome) return s;
  if (key === 'Vault opened' && s.turn < 2) return s;
  if (key === 'Carrier left by your table edge' && !s.soloScenario.trackers['Vault opened']) return s;
  if (key === 'Captive left by your table edge' && !s.soloScenario.trackers['Captive freed']) return s;
  if (key === 'A hero still holds the objective' && s.turn < 8) return s;
  const raisesAlarm = key === 'Vault opened' || key.startsWith('Target ');
  return { ...(raisesAlarm && !s.soloScenario.trackers[key] ? changeAlarm(s, 2) : s),
    soloScenario: { ...s.soloScenario, trackers: { ...s.soloScenario.trackers, [key]: value } } };
}
