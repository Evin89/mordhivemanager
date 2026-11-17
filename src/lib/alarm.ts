import type { BattleSession } from '../store/battle';
import { getWarbandDefinition } from '../data/warbandRegistry';
import { equipNpcModel } from './npc';
import { createHenchmenGroupFromType } from './warbandFactory';
import { baseBehaviour } from './behaviours';
import { countModels } from './rating';
import { generateId } from './id';
import { drawAlarmEvent } from './alarmEvents';
import { drawClockCard } from './clockDeck';
export const alarmGrade = (value: number) => value === 0 ? 0 : Math.ceil(Math.min(15, Math.max(0, value)) / 5);
export const alarmLabels = ['Quiet', 'Stirring', 'Roused', 'Swarming'];
/** Reinforcements per turn advance. Grade 1 (Stirring) brings none, grade 2 one,
 *  grade 3 two; Hold the Line's locked alarm brings two. Tuned after the
 *  2026-11-17 playtest, where one per turn from alarm 1 made quiet and loud play
 *  end up almost the same. */
export function reinforcementsForGrade(grade: number, locked = false): number {
    return locked ? 2 : Math.max(0, grade - 1);
}
/** Scenarios where twice the enemy's own number can arrive in total. */
const doubleCapacity = (s: BattleSession) => ['solo-hold', 'solo-salvage'].includes(s.soloScenario?.id ?? '');
export function alarmCapacity(s: BattleSession): number { return s.npcWarband ? Math.max(0, countModels(s.npcWarband) * (doubleCapacity(s) ? 2 : 1) - s.npcReinforcements.length) : 0; }

const ENTRIES = ['enemy table edge', 'enemy table edge', 'left edge', 'right edge', 'nearest building to the objective (ground floor)', 'your table edge'];

/** Up to `count` new enemy models, within the capacity left. `kind` picks the
 *  cheapest henchman type (the usual answer to the alarm) or the most expensive
 *  one (the Reckoning's last card). */
export function makeReinforcements(s: BattleSession, count: number, kind: 'cheapest' | 'priciest' = 'cheapest'): BattleSession['npcReinforcements'] {
    if (!s.npcWarband || count <= 0) return [];
    const def = getWarbandDefinition(s.npcWarband.warbandType);
    const types = def?.henchmenTypes.filter(t => t.cost !== null).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0)) ?? [];
    const type = kind === 'cheapest' ? types[0] : types[types.length - 1];
    if (!def || !type) return [];
    const template = createHenchmenGroupFromType(type, type.unitType, 1);
    if (!type.isAnimal) template.equipment.push(...equipNpcModel(def, type.equipmentOptions, template.stats));
    const added: BattleSession['npcReinforcements'] = [];
    for (let i = 0; i < Math.min(count, alarmCapacity(s)); i++) {
        // Intel "Back Way": nothing comes in at your own table edge.
        const roll = 1 + Math.floor(Math.random() * (s.intel?.card === '8' ? 5 : 6));
        const entry = s.alarmEvent?.id === 'bulkheads' ? 'enemy table edge' : ENTRIES[roll - 1];
        added.push({ id: generateId(), unitType: type.unitType, stats: { ...template.stats }, equipment: template.equipment.map(e => e.name), entry, behaviour: baseBehaviour(template), outOfAction: false });
    }
    return added;
}

export function advanceTurn(s: BattleSession, playerType = ''): BattleSession {
    const next: BattleSession = { ...s, turn: s.turn + 1, behaviourTicks: {}, activation: {}, alarmEvent: null, pendingChoice: null };
    if (!s.alarmEnabled || !s.npcWarband)
        return next;
    const salvage = s.soloScenario?.id === 'solo-salvage';
    const locked = s.soloScenario?.id === 'solo-hold' && next.turn >= 2;
    const grade = salvage ? 0 : locked ? 2 : alarmGrade(s.alarm);
    let count = salvage
        // The Salvage: at the end of turn N, N of them come, whatever the alarm says.
        ? s.turn
        : reinforcementsForGrade(grade, locked) + (s.alarmEvent?.id === 'vox-call' ? 1 : 0);
    if (s.turn === 1 && s.intel?.card === '2') count = 0; // Patrol Schedule
    if (s.turn === 1 && s.intel?.card === 'Q') count += 2; // Forewarned
    let added = makeReinforcements(s, count);
    let voxRelayUsed = s.voxRelayUsed;
    const messages: string[] = [];
    if (added.length && s.assets.includes('vox-relay') && !voxRelayUsed) {
        added = added.slice(1);
        voxRelayUsed = true;
        messages.push('Vox Relay: the first one to answer never arrives.');
    }
    messages.push(salvage
        ? `End of turn ${s.turn}: ${added.length} reinforcement(s)${added.length ? ' — ' + added.map(r => `${r.unitType} at ${r.entry}`).join('; ') : ''}`
        : `Alarm ${s.alarm} (grade ${grade}): ${added.length} reinforcement(s)${added.length ? ' — ' + added.map(r => `${r.unitType} at ${r.entry}`).join('; ') : ''}`);
    // Every model that answers the alarm quiets it by 1, so the meter only stays high while the noise continues.
    const alarm = salvage ? 0 : locked ? 8 : Math.max(0, s.alarm - added.length);
    let resolved: BattleSession = { ...next, alarm, voxRelayUsed, npcReinforcements: [...s.npcReinforcements, ...added], events: [...messages.reverse().map(text => ({ id: generateId(), turn: next.turn, text })), ...s.events] };
    if (grade === 3) resolved = drawAlarmEvent(resolved, playerType);
    return drawClockCard(resolved);
}
