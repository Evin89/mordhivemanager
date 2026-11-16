import type { BattleSession, Contact, ThirdParty } from '../store/battle';
import { warbandDefinitions } from '../data/warbandRegistry';
import type { WarbandDefinition } from '../data/types';
import { generateBattlefield } from './battlefield';
import { mulberry32 } from './scenarioGen';
import scenarios from '../data/scenarios.json';
import { generateId } from './id';
import { createHenchmenGroupFromType } from './warbandFactory';
import { equipNpcModel } from './npc';
import { findSoloScenario } from './soloScenarios';
import { alarmGrade } from './alarm';
const entries = ['enemy table edge', 'enemy table edge', 'left edge', 'right edge', 'nearest building to the objective (ground floor)', 'your table edge'];
export function prepareContacts(s: BattleSession): Partial<BattleSession> {
    if (!s.npcWarband || !s.hiddenContacts || s.contacts.length)
        return {};
    const seed = s.battlefieldSeed ?? Math.floor(Math.random() * 4294967296);
    const scenarioId = findSoloScenario(s.scenario)?.mapBase ?? scenarios.scenarios.find(item => item.name === s.scenario)?.id ?? '';
    const field = generateBattlefield(seed, scenarioId);
    const random = mulberry32(seed ^ 0x5a5a);
    const slots: Pick<Contact, 'kind' | 'refId'>[] = [
        ...s.npcWarband.heroes.map(h => ({ kind: 'hero' as const, refId: h.id })),
        ...s.npcWarband.henchmenGroups.map(g => ({ kind: 'group' as const, refId: g.id })),
        ...Array.from({ length: s.soloScenario?.id === 'solo-hunt' ? 4 : 2 }, () => ({ kind: 'echo' as const, refId: null })),
    ];
    for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    const contacts: Contact[] = [];
    for (const slot of slots) {
        let best = { x: 2, y: 98 };
        let distance = -1;
        for (let attempt = 0; attempt < 3000; attempt++) {
            const point = { x: 2 + random() * 96, y: scenarioId === 'defend-the-find' ? 2 + random() * 96 : 50 + random() * 48 };
            if (field.buildings.some(b => point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h))
                continue;
            if (scenarioId === 'defend-the-find' && point.x >= 35 && point.x <= 65 && point.y >= 35 && point.y <= 65)
                continue;
            const spacing = Math.min(...contacts.map(c => Math.hypot(c.x - point.x, c.y - point.y)));
            if (spacing > distance) {
                best = point;
                distance = spacing;
            }
            if (spacing >= 8)
                break;
        }
        let index = contacts.length + 1;
        let letter = '';
        while (index) {
            index--;
            letter = String.fromCharCode(65 + index % 26) + letter;
            index = Math.floor(index / 26);
        }
        contacts.push({ ...slot, ...best, letter, revealed: false });
    }
    return { battlefieldSeed: seed, contacts };
}
export function revealContacts(s: BattleSession, letter?: string): BattleSession {
    const messages = s.contacts.filter(c => !c.revealed && (!letter || c.letter === letter)).map(c => {
        const actor = c.kind === 'hero' ? s.npcWarband?.heroes.find(h => h.id === c.refId)?.name : s.npcWarband?.henchmenGroups.find(g => g.id === c.refId)?.groupName;
        return { id: generateId(), turn: s.turn, text: c.kind === 'echo' ? `Contact ${c.letter} was an echo` : `Contact ${c.letter} is ${actor}` };
    });
    return { ...s, contacts: s.contacts.map(c => !letter || c.letter === letter ? { ...c, revealed: true } : c), events: [...messages, ...s.events] };
}
export function applyContactAlarm(s: BattleSession): BattleSession {
    if (s.alarmEvent?.id === 'ghost' && s.alarmEvent.turn === s.turn) return s;
    if (!s.hiddenContacts || !s.alarmEnabled || alarmGrade(s.alarm) < 2 || !s.contacts.some(c => !c.revealed))
        return s;
    const next = revealContacts(s);
    return { ...next, events: [{ id: generateId(), turn: s.turn, text: 'The alarm is raised: all contacts move in the open.' }, ...next.events] };
}
export function thirdPartyType(def: WarbandDefinition) {
    return def.henchmenTypes.find(t => t.isAnimal) ?? def.henchmenTypes.filter(t => !t.isAnimal && t.cost !== null).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0];
}
export function buildThirdParty(def: WarbandDefinition, random = Math.random): ThirdParty | null {
    const type = thirdPartyType(def);
    if (!type)
        return null;
    const group = createHenchmenGroupFromType(type, type.unitType, 2 + Math.floor(random() * 3));
    if (!type.isAnimal)
        group.equipment.push(...equipNpcModel(def, type.equipmentOptions, group.stats));
    return { listName: def.name, unitType: type.unitType, stats: group.stats, equipment: type.isAnimal ? [] : group.equipment.map(e => e.name), count: group.count, outOfAction: 0, entry: entries[Math.floor(random() * 6)], behaviour: type.isAnimal ? 'beast' : 'brawler', gone: false };
}
export function advanceStrangers(s: BattleSession, playerType: string, grade: number, random = Math.random, force = false): BattleSession {
    if (!s.thirdPartyEnabled || !s.npcWarband || s.thirdParty || (!force && s.turn < 2))
        return s;
    if (!force && 1 + Math.floor(random() * 6) + grade < 6)
        return s;
    const eligible = warbandDefinitions.filter(d => d.id !== playerType && d.id !== s.npcWarband?.warbandType);
    const thirdParty = buildThirdParty(eligible[Math.floor(random() * eligible.length)], random);
    if (!thirdParty)
        return s;
    return { ...s, thirdParty, events: [{ id: generateId(), turn: s.turn, text: `A ${thirdParty.behaviour === 'beast' ? 'pack' : 'patrol'} of ${thirdParty.unitType} — ${thirdParty.listName} arrives at ${thirdParty.entry}.` }, ...s.events] };
}
