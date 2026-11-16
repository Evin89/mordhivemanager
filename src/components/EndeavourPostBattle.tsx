import type { Warband } from '../types';
import type { BattleSession } from '../store/battle';
import type { PostBattleDraft, InjuryResult } from '../lib/postBattle';
import { deck } from '../lib/endeavours';
import injuries from '../data/injuries.json';
import { Button } from './ui';
import { SoloPlate } from './SoloNote';
export function EndeavourAwards({warband:w,session:s,draft,onAward}: {warband:Warband;session:BattleSession|undefined;draft:PostBattleDraft;onAward:(id:string,cardId:string)=>void}) {
 const awarded=draft.endeavourAwards;
 const cards=s?.endeavours.filter(c=>c.completed&&c.modelId&&c.cardId!=='deal-with-death')??[];
 if(!cards.length)return null;
 return <SoloPlate>{cards.map(c=>{const h=w.heroes.find(h=>h.id===c.modelId);const g=w.henchmenGroups.find(g=>g.id===c.modelId);return <div key={c.cardId} className="space-y-2"><p className="font-body text-sm">{h?.name??g?.groupName??'Unknown model'} - {deck.cards.find(d=>d.id===c.cardId)?.title}: may be awarded +1 Experience Point</p><Button disabled={awarded.includes(c.cardId)||(!h&&!g)||!!(h&&draft.heroes[h.id]?.dies)||!!g?.isAnimal} onClick={()=>{onAward(c.modelId!,c.cardId);}}>Award</Button></div>;})}</SoloPlate>;
}
export function JokerReminder({session:s,injury,onUse}: {session:BattleSession|undefined;injury:InjuryResult|null;onUse:(injury:InjuryResult)=>void}) {
 const card=s?.endeavours.find(c=>c.cardId==='deal-with-death');
 if(!card)return null;
 const text=deck.cards.find(c=>c.id===card.cardId)!;
 const eligible=!!injury&&Number(injury.roll)>=11&&Number(injury.roll)<=15;
 return <SoloPlate><p className="font-body text-sm whitespace-pre-wrap">{text.rules}</p><Button disabled={card.used||!eligible} onClick={()=>{const row=injuries.table.find(t=>t.roll==='66');if(row)onUse({roll:'66',name:row.name,effect:row.effect});}}>{card.used?'Used':'Use'}</Button></SoloPlate>;
}
