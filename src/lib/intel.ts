import type { BattleSession } from '../store/battle';
import { revealContacts } from './battleEncounters';
import { generateId } from './id';

/** Phase 6, after ACOLYTE's investigation deck: one optional card before a solo
 *  battle. Mostly help, sometimes not. App-original · Not part of the ruleset. */
export const intelCards = [
  { id: 'A', name: 'Marked Cache', text: 'Someone chalked a sign on the right door.', effect: 'Search points are on. Point 1 is certain to give a lead.' },
  { id: '2', name: 'Patrol Schedule', text: 'You know when they change the watch.', effect: 'No reinforcements arrive at the first turn advance.' },
  { id: '3', name: 'Quiet Approach', text: 'The long way round, through the drains.', effect: 'The alarm cannot rise during turn 1.' },
  { id: '4', name: 'Portent', text: 'A bad dream that came true last time.', effect: 'Foresight once this battle: see two alarm or Reckoning cards, keep one.' },
  { id: '5', name: 'Floor Plans', text: 'Old plans, mostly right.', effect: 'With hidden contacts, one contact starts revealed. Otherwise search points are on.' },
  { id: '6', name: 'Bribed Sentry', text: 'One of them took the money.', effect: 'One model fewer in their largest henchman group (if it has more than one).' },
  { id: '7', name: 'Loose Talk', text: 'Someone in a drinking hole talked too much.', effect: 'In a Hive mission: +1 clue if you win. Otherwise as Marked Cache.' },
  { id: '8', name: 'Back Way', text: 'You know where their back door is, and they do not know yours.', effect: 'Reinforcements never enter at your table edge this battle.' },
  { id: '9', name: 'Nothing Useful', text: 'A week of asking around, for nothing.', effect: 'No effect.' },
  { id: '10', name: 'Nothing Useful', text: 'Every lead went cold.', effect: 'No effect.' },
  { id: 'J', name: 'Spotted', text: 'A face at a window, then gone.', effect: 'The alarm starts 3 higher.' },
  { id: 'Q', name: 'Forewarned', text: 'They knew you were coming.', effect: 'Two extra reinforcements arrive at the first turn advance.' },
  { id: 'K', name: 'Ambush', text: 'They were already waiting.', effect: 'During turn 1 every enemy acts as a Beast.' },
] as const;

export const intelCard = (id?: string | null) => intelCards.find(card => card.id === id);

export function drawIntel(s: BattleSession): BattleSession {
  if (s.started || !s.npcWarband) return s;
  const canRedraw = !!s.intel && !s.intel.redrawn && s.assets.includes('spy-network');
  if (s.intel && !canRedraw) return s;
  const pool = intelCards.filter(card => card.id !== s.intel?.card);
  const card = pool[Math.floor(Math.random() * pool.length)];
  return { ...s, intel: { card: card.id, redrawn: !!s.intel } };
}

/** Marked Cache (and Loose Talk outside a Hive mission) makes point 1 a lead. */
export function markedCache(s: BattleSession): boolean {
  return s.intel?.card === 'A' || (s.intel?.card === '7' && !s.soloMission);
}

/** Effects that are set up when the battle starts. Runs once, after the solo
 *  scenario and search points are prepared. */
export function applyIntelAtStart(s: BattleSession): BattleSession {
  let next: BattleSession = { ...s, foresight: (s.assets.includes('seer') ? 1 : 0) + (s.intel?.card === '4' ? 1 : 0) };
  const card = intelCard(s.intel?.card);
  if (!card) return next;
  if (card.id === '5' && next.hiddenContacts) {
    const hidden = next.contacts.filter(c => !c.revealed && c.kind !== 'echo');
    if (hidden.length) next = revealContacts(next, hidden[0].letter);
  }
  if (card.id === '6' && next.npcWarband) {
    const groups = [...next.npcWarband.henchmenGroups].filter(g => g.count > 1).sort((a, b) => b.count - a.count);
    if (groups[0]) {
      next = { ...next, npcWarband: { ...next.npcWarband, henchmenGroups: next.npcWarband.henchmenGroups.map(g => g.id === groups[0].id ? { ...g, count: g.count - 1 } : g) } };
    }
  }
  // Cards that act on the alarm do nothing where the alarm plays no part.
  const alarmCard = ['2', '3', '8', 'J', 'Q'].includes(card.id);
  const idle = alarmCard && (!next.alarmEnabled || (next.soloScenario?.id === 'solo-salvage' && ['3', 'J'].includes(card.id)));
  if (card.id === 'J' && !idle) next = { ...next, alarm: Math.min(15, next.alarm + 3) };
  return { ...next, events: [{ id: generateId(), turn: 1, text: `Intel — ${card.name}: ${idle ? 'no effect in this battle (the alarm plays no part).' : card.effect}` }, ...next.events] };
}

/** Intel cards that switch search points on must do so before they are placed. */
export function intelWantsSearch(s: BattleSession): boolean {
  return markedCache(s) || (s.intel?.card === '5' && !s.hiddenContacts);
}
