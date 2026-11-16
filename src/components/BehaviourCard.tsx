import { BattleSession } from '../store/battle';
import { Behaviour, behaviourSteps, labels } from '../lib/behaviours';
import { Select } from './ui';
import { generateId } from '../lib/id';

export default function BehaviourCard({ id, name, behaviour, session, update }: {
  id: string;
  name: string;
  behaviour: Behaviour;
  session: BattleSession;
  update: (patch: Partial<BattleSession>) => void;
}) {
  const overridden = session.alarmEnabled && session.alarmEvent?.id === 'horn';
  const steps = behaviourSteps(overridden ? 'beast' : behaviour, session.npcAgenda?.temperament);
  const ticks = session.behaviourTicks[id] ?? [];

  function toggleStep(index: number, step: string) {
    const done = ticks.includes(index);
    update({
      behaviourTicks: {
        ...session.behaviourTicks,
        [id]: done ? ticks.filter(t => t !== index) : [...ticks, index],
      },
      ...(!done ? {
        events: [{ id: generateId(), turn: session.turn, text: `${name}: ${step}` }, ...session.events],
      } : {}),
    });
  }

  return (
    <div className="space-y-1">
      <label className="font-ui">
        Behaviour
        <Select
          aria-label={`${name} behaviour`}
          disabled={overridden}
          value={overridden ? 'beast' : behaviour}
          onChange={e => update({
            npcBehaviours: { ...session.npcBehaviours, [id]: e.target.value as Behaviour },
            behaviourTicks: { ...session.behaviourTicks, [id]: [] },
          })}
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </label>
      <ol className="font-body text-xs">
        {steps.map((step, index) => (
          <li key={step}>
            <button
              className={`min-h-[44px] w-full text-left py-2 ${ticks.includes(index) ? 'text-brass-text' : 'text-ink-faded'}`}
              aria-pressed={ticks.includes(index)}
              onClick={() => toggleStep(index, step)}
            >
              {ticks.includes(index) ? '\u2713' : `${index + 1}.`} {step}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
