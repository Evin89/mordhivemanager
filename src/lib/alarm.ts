import type { BattleSession } from '../store/battle';
import { getWarbandDefinition } from '../data/warbandRegistry';
import { equipNpcModel } from './npc';
import { createHenchmenGroupFromType } from './warbandFactory';
import { baseBehaviour } from './behaviours';
import { countModels } from './rating';
import { generateId } from './id';
import { rollHiveEvent } from './oracle';
export const alarmGrade = (value: number) => value === 0 ? 0 : Math.ceil(Math.min(15,Math.max(0,value))/5);
export const alarmLabels = ['Quiet','Stirring','Roused','Swarming'];
export function alarmCapacity(s: BattleSession): number { return s.npcWarband ? Math.max(0,countModels(s.npcWarband)-s.npcReinforcements.length) : 0; }
export function advanceTurn(s: BattleSession): BattleSession {
 const next={...s,turn:s.turn+1,behaviourTicks:{}};
 if(!s.alarmEnabled || !s.npcWarband) return next;
 const grade=alarmGrade(s.alarm);
 const def=getWarbandDefinition(s.npcWarband.warbandType);
 const cheapest=def?.henchmenTypes.filter(t=>t.cost!==null).sort((a,b)=>(a.cost??0)-(b.cost??0))[0];
 const messages: string[]=[];
 const added: BattleSession['npcReinforcements']=[];
 if(cheapest && def) {
   const template=createHenchmenGroupFromType(cheapest,cheapest.unitType,1);
   template.equipment.push(...equipNpcModel(def,cheapest.equipmentOptions,template.stats));
   if(template) for(let i=0;i<Math.min(grade,alarmCapacity(s));i++) {
     const roll=1+Math.floor(Math.random()*6);
     const entry=['enemy table edge','enemy table edge','left edge','right edge','nearest building to the objective (ground floor)','your table edge'][roll-1];
     added.push({id:generateId(),unitType:cheapest.unitType,stats:{...template.stats},equipment:template.equipment.map(e=>e.name),entry,behaviour:baseBehaviour(template),outOfAction:false});
   }
 }
 messages.push(`Alarm ${s.alarm} (grade ${grade}): ${added.length} reinforcement(s)${added.length ? ' — '+added.map(r=>`${r.unitType} at ${r.entry}`).join('; ') : ''}`);
 if(grade===3) { const event=rollHiveEvent(); messages.push(`Hive event ${event.roll}: ${event.text}`); }
 // Every model that answers the alarm quiets it by 2, so the meter only stays high while the noise continues.
 const alarm=Math.max(0,s.alarm-2*added.length);
 return {...next,alarm,npcReinforcements:[...s.npcReinforcements,...added],events:[...messages.map(text=>({id:generateId(),turn:next.turn,text})),...s.events]};
}
