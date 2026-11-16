import type { BattleSession } from '../store/battle';
import { alarmEvents } from '../lib/alarmEvents';
import { SoloPlate } from './SoloNote';

export default function AlarmEventCard({ session }: { session: BattleSession }) {
  const card = alarmEvents.find(e => e.id === session.alarmEvent?.id);
  if (!session.alarmEnabled || !card) return null;
  return (
    <div className="cogitator" role="status">
      <SoloPlate>
        <h2 className="font-heading text-3xl">{card.name}</h2>
        <p>{card.text}</p>
        <p>{card.effect}</p>
        {card.id === 'ghost' && !session.hiddenContacts && <p>Static on the auspex.</p>}
      </SoloPlate>
    </div>
  );
}
