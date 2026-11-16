import { useNavigate } from 'react-router-dom';
import type { BattleSession } from '../store/battle';
import { clearBattleSession, defaultBattleSession, loadBattleSession, saveBattleSession } from '../store/battle';
import { Button } from './ui';
import { SoloPlate } from './SoloNote';
export function AllyAfterBattle({session:s,onDone}: {session:BattleSession;onDone:()=>void}) {
 const navigate=useNavigate();
 return <SoloPlate><h1 className="font-heading text-3xl">Allied aftermath</h1>{s.allies.map((a,i)=><div key={a.warband.id} className="space-y-3"><h2 className="font-heading text-2xl">{a.warband.name}</h2><p className="font-body text-sm">Heroes out of action: {a.warband.heroes.filter(h=>a.outOfAction.heroIds.includes(h.id)).map(h=>h.name).join(', ')||'none'}</p><p className="font-body text-sm">Henchmen out of action: {a.warband.henchmenGroups.map(g=>`${g.groupName}: ${a.outOfAction.henchmenCounts[g.id]??0}`).join('; ')||'none'}</p>{a.source==='own'?<Button onClick={()=>{
 if(loadBattleSession(a.warband.id)?.started&&!window.confirm('This ally already has a battle session. Replace it with this battle?'))return;
 const next:BattleSession={...defaultBattleSession(a.warband.id),scenario:s.scenario,opponentName:s.opponentName,result:s.result,started:true,outOfAction:a.outOfAction,endeavours:a.endeavours??[],npcOutOfAction:s.npcOutOfAction,npcReinforcements:s.npcReinforcements,allies:s.allies.filter((_,j)=>j!==i)};
 saveBattleSession(next);clearBattleSession(s.warbandId);navigate(`/warbands/${a.warband.id}/post-battle`,{replace:true});
 }}>Continue to post-battle for {a.warband.name}</Button>:<p className="font-body text-sm">Read-only gallery summary: copy these casualties for its owner. No changes are saved to this warband.</p>}</div>)}<Button variant="secondary" onClick={onDone}>Finish</Button></SoloPlate>;
}
