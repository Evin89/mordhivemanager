import type { BattleSession } from '../store/battle';
import { generateId } from './id';
import { changeAlarm } from './alarmEvents';
import { makeReinforcements } from './alarm';

/** Phase 6, after ACOLYTE's ritual deck: the Reckoning is a clock you can see.
 *  One card at every turn advance; one of them is their last step. Taking their
 *  leader out of action before it shows takes that card out of the deck.
 *  App-original · Not part of the ruleset. */
export const clockCards = [
  { id: 'last-step', name: 'The Last Step', text: 'They finish what they came to do.', effect: 'Three reinforcements of their most expensive henchman type arrive now.' },
  { id: 'more', name: 'More of Them', text: 'Boots on a stair somewhere close.', effect: 'One reinforcement arrives now.' },
  { id: 'horn', name: "Hunters' Horn", text: 'They have stopped being careful.', effect: 'This turn every enemy acts as a Beast.' },
  { id: 'lights-out', name: 'Lights Out', text: 'The lumen-strips die.', effect: 'The alarm cannot rise this turn.' },
  { id: 'all-clear', name: 'False All-clear', text: 'A horn sounds twice. Half of them believe it.', effect: 'Alarm −3.' },
  { id: 'floor', name: 'The Floor Gives Way', text: 'A walkway goes, loudly.', effect: 'Alarm +2.' },
  { id: 'breath', name: 'A Breath', text: 'For a moment, nothing.', effect: 'No effect.' },
] as const;

const DECK = ['last-step', 'more', 'more', 'horn', 'lights-out', 'all-clear', 'floor', 'breath'];

export function newClockDeck(): string[] {
  const deck = [...DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const clockCard = (id: string) => clockCards.find(card => card.id === id);

function log(s: BattleSession, text: string): BattleSession {
  return { ...s, events: [{ id: generateId(), turn: s.turn, text }, ...s.events] };
}

export function applyClockCard(s: BattleSession, id: string): BattleSession {
  const card = clockCard(id);
  if (!card) return s;
  let next: BattleSession = { ...s, clockCard: { id, turn: s.turn } };
  if (id === 'last-step' || id === 'more') {
    const added = makeReinforcements(next, id === 'last-step' ? 3 : 1, id === 'last-step' ? 'priciest' : 'cheapest');
    next = { ...next, npcReinforcements: [...next.npcReinforcements, ...added] };
    next = log(next, `${card.name}: ${added.length} reinforcement(s)${added.length ? ' — ' + added.map(r => `${r.unitType} at ${r.entry}`).join('; ') : ''}`);
  } else {
    if (id === 'all-clear') next = changeAlarm(next, -3);
    if (id === 'floor') next = changeAlarm(next, 2);
    next = log(next, `${card.name}: ${card.effect}`);
  }
  return next;
}

/** Draw at a turn advance. With foresight left (and no other choice open) the
 *  player sees two and keeps one. */
export function drawClockCard(s: BattleSession): BattleSession {
  if (!s.clockDeck) return s;
  const deck = [...s.clockDeck];
  if (!deck.length) return s;
  if (s.foresight > 0 && !s.pendingChoice && deck.length >= 2) {
    const ids: [string, string] = [deck.shift()!, deck.shift()!];
    return { ...s, clockDeck: deck, foresight: s.foresight - 1, pendingChoice: { deck: 'clock', ids } };
  }
  const id = deck.shift()!;
  return applyClockCard({ ...s, clockDeck: deck }, id);
}

export function keepClockChoice(s: BattleSession, keep: string): BattleSession {
  if (s.pendingChoice?.deck !== 'clock' || !s.pendingChoice.ids.includes(keep)) return s;
  const other = s.pendingChoice.ids.find(id => id !== keep)!;
  return applyClockCard({ ...s, pendingChoice: null, clockDeck: [...(s.clockDeck ?? []), other] }, keep);
}

/** Their leader down before the last card shows: the card leaves the deck. */
export function checkClock(s: BattleSession): BattleSession {
  const leader = s.npcWarband?.heroes.find(h => h.isLeader);
  if (!s.clockDeck || !leader || !s.npcOutOfAction.heroIds.includes(leader.id)) return s;
  const inDeck = s.clockDeck.includes('last-step');
  const inChoice = s.pendingChoice?.deck === 'clock' && s.pendingChoice.ids.includes('last-step' as never);
  if (!inDeck && !inChoice) return s;
  let next: BattleSession = { ...s, clockDeck: s.clockDeck.filter(id => id !== 'last-step') };
  if (inChoice) {
    const other = s.pendingChoice!.ids.find(id => id !== 'last-step')!;
    next = { ...next, pendingChoice: null };
    next = applyClockCard(next, other);
  }
  return log(next, 'Their leader is down. The scheme falters: The Last Step is out of the deck.');
}
