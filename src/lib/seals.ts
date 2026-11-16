import type { Warband } from '../types';
import type { BattleRow } from './battles';

export const seals = [
  { id: 'first-descent', name: 'First Descent', line: 'Went down. Came back.', condition: 'Fight a battle' },
  { id: 'blooded', name: 'Blooded', line: 'Five times into the ruins.', condition: 'Fight 5 battles' },
  { id: 'long-war', name: 'The Long War', line: 'Ten battles, and still on the rolls.', condition: 'Fight 10 battles' },
  { id: 'victor', name: 'Spoils of the Hive', line: 'Three victories carried home.', condition: 'Win 3 battles' },
  { id: 'unbroken', name: 'Unbroken', line: 'Three in a row. The hive noticed.', condition: 'Win 3 battles in a row' },
  { id: 'reaper', name: "Reaper's Tally", line: 'Ten foes put down.', condition: 'Take 10 enemies out of action' },
  { id: 'butchers-bill', name: "The Butcher's Bill", line: 'Five names struck from the roster.', condition: 'Lose 5 of your own' },
  { id: 'alone', name: 'Alone in the Dark', line: 'Won with no one to witness it.', condition: 'Win a solo battle' },
  { id: 'hoard', name: 'Diamantine Hoard', line: 'Ten shards, and counting.', condition: 'Hold 10 diamantine' },
  { id: 'scarred', name: 'Scarred', line: 'Three wounds on one warrior. Still fighting.', condition: 'Have a hero with 3 injuries' },
  { id: 'storied', name: 'Storied', line: 'One of them has become somebody.', condition: 'Have a hero with 5 advances' },
] as const;

export type SealId = typeof seals[number]['id'];

export function earnedSeals(warband: Warband, battles: readonly BattleRow[]): SealId[] {
  let streak = 0;
  let unbroken = false;
  for (const battle of [...battles].sort((a, b) => a.playedOn.localeCompare(b.playedOn))) {
    streak = battle.result === 'win' ? streak + 1 : 0;
    if (streak >= 3) unbroken = true;
  }
  const conditions: Record<SealId, boolean> = {
    'first-descent': battles.length >= 1,
    blooded: battles.length >= 5,
    'long-war': battles.length >= 10,
    victor: battles.filter(battle => battle.result === 'win').length >= 3,
    unbroken,
    reaper: battles.reduce((sum, battle) => sum + (battle.record?.enemiesTakenOut ?? 0), 0) >= 10,
    'butchers-bill': battles.reduce((sum, battle) => sum + (battle.record?.modelsLost ?? 0), 0) >= 5,
    alone: battles.some(battle => battle.result === 'win' && (battle.opponent ?? "").endsWith('(solo)')),
    hoard: warband.wyrdstoneShards >= 10,
    scarred: warband.heroes.some(hero => (hero.injuries ?? []).length >= 3),
    storied: warband.heroes.some(hero => (hero.advances ?? []).length >= 5),
  };
  return seals.filter(seal => conditions[seal.id]).map(seal => seal.id);
}
