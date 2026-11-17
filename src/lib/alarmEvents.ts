import type { BattleSession } from '../store/battle';
import { advanceStrangers } from './battleEncounters';
import { generateId } from './id';

export const alarmEvents = [
  {
    "id": "lights-out",
    "name": "Lights Out",
    "text": "The lumen-strips die. For a moment nobody can tell where the noise is coming from.",
    "effect": "The alarm cannot rise until the next turn."
  },
  {
    "id": "bulkheads",
    "name": "Bulkheads Slam",
    "text": "Somewhere a door the size of a hab comes down.",
    "effect": "Every reinforcement arriving next turn enters at the enemy table edge."
  },
  {
    "id": "vox-call",
    "name": "Vox Call Answered",
    "text": "Someone on their side just got through.",
    "effect": "One extra reinforcement arrives next turn."
  },
  {
    "id": "floor",
    "name": "The Floor Gives Way",
    "text": "A walkway goes, loudly.",
    "effect": "Alarm +2."
  },
  {
    "id": "all-clear",
    "name": "False All-clear",
    "text": "A horn sounds twice. Half of them believe it.",
    "effect": "Alarm −3."
  },
  {
    "id": "stirs",
    "name": "Something Stirs",
    "text": "That was not them. That was not you.",
    "effect": "Strangers arrive now if they are in play and have not come yet. Otherwise alarm +1."
  },
  {
    "id": "ghost",
    "name": "Auspex Ghost",
    "text": "The screen fills with returns that were not there a second ago.",
    "effect": "With hidden contacts in play, two new contacts appear on the map."
  },
  {
    "id": "horn",
    "name": "Hunters' Horn",
    "text": "They have stopped being careful.",
    "effect": "Until the next turn every enemy acts as a Beast."
  }
];

export function changeAlarm(s: BattleSession, amount: number): BattleSession {
  if (!s.alarmEnabled) return s;
  if (s.soloScenario?.id === 'solo-hold' && s.turn >= 2) return { ...s, alarm: 8 };
  if (s.soloScenario?.id === 'solo-salvage') return { ...s, alarm: 0 };
  if (amount > 0 && s.alarmEvent?.id === 'lights-out' && s.alarmEvent.turn === s.turn) return s;
  if (amount > 0 && s.clockCard?.id === 'lights-out' && s.clockCard.turn === s.turn) return s;
  if (amount > 0 && s.turn === 1 && s.intel?.card === '3') return s; // Quiet Approach
  return { ...s, alarm: Math.max(0, Math.min(15, s.alarm + amount)) };
}

export function applyAlarmEvent(s: BattleSession, id: string, playerType = ''): BattleSession {
  if (!s.alarmEnabled) return s;
  let next = { ...s, alarmEvent: { id, turn: s.turn } };
  if (id === 'floor') next = changeAlarm(next, 2) as typeof next;
  if (id === 'all-clear') next = changeAlarm(next, -3) as typeof next;
  if (id === 'stirs') {
    next = (s.thirdPartyEnabled && !s.thirdParty
      ? advanceStrangers(next, playerType, 0, Math.random, true)
      : changeAlarm(next, 1)) as typeof next;
  }
  if (id === 'ghost' && s.hiddenContacts) {
    next = { ...next, contacts: [...s.contacts, ...Array.from({ length: 2 }, (_, i) => ({
      letter: `E${s.contacts.length + i + 1}`, x: 5 + Math.random() * 90, y: 5 + Math.random() * 90,
      kind: 'echo' as const, refId: null, revealed: false,
    }))] };
  }
  const card = alarmEvents.find(e => e.id === id);
  return { ...next, events: [{ id: generateId(), turn: s.turn, text: `${card?.name}: ${card?.text} ${card?.effect}${id === 'ghost' && !s.hiddenContacts ? ' Static on the auspex.' : ''}` }, ...next.events] };
}

function shuffled(ids: string[]): string[] {
  const deck = [...ids];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawAlarmEvent(s: BattleSession, playerType = ''): BattleSession {
  if (!s.alarmEnabled) return s;
  const deck = [...s.alarmDeck];
  if (deck.length < 2) deck.push(...shuffled(alarmEvents.map(e => e.id).filter(id => !deck.includes(id))));
  // Foresight (phase 6): see two, keep one; the other goes to the bottom.
  if (s.foresight > 0 && !s.pendingChoice) {
    const ids: [string, string] = [deck.shift()!, deck.shift()!];
    return { ...s, alarmDeck: deck, foresight: s.foresight - 1, pendingChoice: { deck: 'alarm', ids } };
  }
  const id = deck.shift()!;
  return applyAlarmEvent({ ...s, alarmDeck: deck }, id, playerType);
}

/** Keep one of the two foresight cards; the other goes under its deck. */
export function keepAlarmChoice(s: BattleSession, keep: string, playerType = ''): BattleSession {
  if (s.pendingChoice?.deck !== 'alarm' || !s.pendingChoice.ids.includes(keep)) return s;
  const other = s.pendingChoice.ids.find(id => id !== keep)!;
  return applyAlarmEvent({ ...s, pendingChoice: null, alarmDeck: [...s.alarmDeck, other] }, keep, playerType);
}
