import { BattleSession } from '../store/battle';
import { Behaviour, behaviourSteps, labels } from '../lib/behaviours';
import { Select } from './ui';
import { generateId } from '../lib/id';
export default function BehaviourCard({id,name,behaviour,session,update}: {id:string;name:string;behaviour:Behaviour;session:BattleSession;update:(p:Partial<BattleSession>)=>void}) {
 const steps=behaviourSteps(behaviour,session.npcAgenda?.temperament);
 const ticks=session.behaviourTicks[id]??[];
 return <div className="space-y-1"><label className="font-ui">Behaviour<Select aria-label={`${name} behaviour`} value={behaviour} onChange={e=>update({npcBehaviours:{...session.npcBehaviours,[id]:e.target.value as Behaviour},behaviourTicks:{...session.behaviourTicks,[id]:[]}})}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></label><ol className="font-body text-xs">{steps.map((step,i)=><li key={step}><button className={`min-h-[44px] w-full text-left py-2 ${ticks.includes(i)?'text-brass-text':'text-ink-faded'}`} aria-pressed={ticks.includes(i)} onClick={()=>{const done=ticks.includes(i);update({behaviourTicks:{...session.behaviourTicks,[id]:done?ticks.filter(t=>t!==i):[...ticks,i]},...(!done?{events:[{id:generateId(),turn:session.turn,text:`${name}: ${step}`},...session.events]}:{})});}}>{ticks.includes(i)?'\u2713':`${i+1}.`} {step}</button></li>)}</ol></div>;
}
