import type { NpcTemperament } from '../lib/npc';
import Plate from './Plate';
import SoloNote from './SoloNote';
export default function EnemyInstructions({temperament}: {temperament?:NpcTemperament}) {
 return <Plate className="p-3 space-y-2">
  <SoloNote />
  <details open>
   <summary className="min-h-[44px] font-ui cursor-pointer">How the enemy acts</summary>
   <p className="font-body text-sm">Perform the first possible step. Movement (charges first), then shooting, then close combat.</p>
   <ol className="list-decimal pl-5 font-body text-sm">
    <li>Models that can charge this turn.</li>
    <li>Models that can shoot this turn.</li>
    <li>Everyone else, closest to an enemy first.</li>
   </ol>
   <p className="font-body text-sm">{temperament==='cunning'
    ? 'Priority: alone (no friend within 6") > wounded or knocked down/stunned > carrying diamantine > closest.'
    : 'Priority: closest > knocked down or stunned > wounded > carrying diamantine > the leader. Shooting: not in cover comes before closest.'}</p>
   <p className="font-body text-sm">Consider all player warbands when choosing enemies. Use each priority to break ties in the preceding priority.</p>
   <p className="font-body text-sm">Objective: the scenario&apos;s central objective or nearest diamantine counter; otherwise the centre of the table.</p>
   <p className="font-body text-sm">When two options are equal, choose the one that is worse for you. Still equal? Roll a die.</p>
  </details>
 </Plate>;
}
