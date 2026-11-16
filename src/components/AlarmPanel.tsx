import { BattleSession } from '../store/battle';
import { alarmGrade, alarmLabels, alarmCapacity } from '../lib/alarm';
import { generateId } from '../lib/id';
import { Button } from './ui';
import { SoloPlate } from './SoloNote';
export default function AlarmPanel({session:s,update}: {session:BattleSession;update:(p:Partial<BattleSession>)=>void}) {
 if(!s.npcWarband) return null;
 const grade=alarmGrade(s.alarm);
 function change(amount:number,label:string) { const value=Math.min(15,Math.max(0,s.alarm+amount)); update({alarm:value,events:[{id:generateId(),turn:s.turn,text:`${label}: Alarm ${value}`},...s.events]}); }
 return <div className="cogitator"><SoloPlate><label className="flex items-center gap-3 min-h-[44px]"><input type="checkbox" checked={s.alarmEnabled} onChange={e=>update({alarmEnabled:e.target.checked})}/>Alarm</label>{s.alarmEnabled&&<><div className="flex gap-1" aria-label={`Alarm ${s.alarm} of 15`}>{Array.from({length:15},(_,i)=><span key={i} className={`h-4 flex-1 border border-phosphor-dim ${i<s.alarm?'bg-phosphor':'bg-transparent'}`}/>)}</div><p>{s.alarm}/15 · Grade {grade} · {alarmLabels[grade]}</p><div className="flex flex-wrap gap-2">{[[1,'Shots fired +1'],[1,'Close combat +1'],[2,'Explosion or collapse +2'],[-1,'-1']] .map(([amount,label],i)=><Button key={i} variant="secondary" fullWidth={false} onClick={()=>change(Number(amount),String(label))}>{label}</Button>)}</div><p>Next turn: {Math.min(grade,alarmCapacity(s))} reinforcements{grade===3?' and one hive event':''}</p></>}</SoloPlate></div>;
}
