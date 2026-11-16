import { BattleSession } from '../store/battle';
import { alarmGrade, alarmLabels, alarmCapacity } from '../lib/alarm';
import { changeAlarm } from '../lib/alarmEvents';
import { generateId } from '../lib/id';
import { Button } from './ui';
import { SoloPlate } from './SoloNote';

export default function AlarmPanel({ session: s, update }: {
  session: BattleSession;
  update: (patch: Partial<BattleSession>) => void;
}) {
  if (!s.npcWarband) return null;
  const grade = alarmGrade(s.alarm);
  const locked = s.soloScenario?.id === 'solo-hold' && s.turn >= 2;
  const dark = s.alarmEvent?.id === 'lights-out';
  function change(amount: number, label: string) {
    const next = changeAlarm(s, amount);
    update({ ...next, events: [{ id: generateId(), turn: s.turn, text: `${label}: Alarm ${next.alarm}` }, ...s.events] });
  }
  return (
    <div className="cogitator">
      <SoloPlate>
        <label className="flex items-center gap-3 min-h-[44px]">
          <input type="checkbox" checked={s.alarmEnabled} disabled={locked} onChange={e => update({ alarmEnabled: e.target.checked })}/>Alarm
        </label>
        {s.alarmEnabled && <>
          <div className="flex gap-1" aria-label={`Alarm ${s.alarm} of 15`}>
            {Array.from({ length: 15 }, (_, i) => <span key={i} className={`h-4 flex-1 border border-phosphor-dim ${i < s.alarm ? 'bg-phosphor' : 'bg-transparent'}`}/>) }
          </div>
          <p>{s.alarm}/15 · Grade {grade} · {alarmLabels[grade]}</p>
          {locked && <p>Alarm locked at 8. Reinforcement cap doubled.</p>}
          {dark && <p>Lights Out: the alarm cannot rise until the next turn advance.</p>}
          <div className="flex flex-wrap gap-2">
            {[[1, 'Shots fired +1'], [1, 'Close combat +1'], [2, 'Explosion or collapse +2'], [-1, '-1']].map(([amount, label]) => (
              <Button key={label} variant="secondary" fullWidth={false} disabled={locked || dark} onClick={() => change(Number(amount), String(label))}>{label}</Button>
            ))}
          </div>
          <p>Next turn: {Math.min(grade + (s.alarmEvent?.id === 'vox-call' ? 1 : 0), alarmCapacity(s))} reinforcement(s){grade === 3 ? ' and one alarm event' : ''}</p>
          <p>{locked ? 'Arrivals do not change the alarm.' : 'Each arrival quiets the alarm by 2.'}</p>
        </>}
      </SoloPlate>
    </div>
  );
}
