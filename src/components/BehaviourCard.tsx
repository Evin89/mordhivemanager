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
  const overridden = (session.alarmEnabled && session.alarmEvent?.id === 'horn')
    || (session.clockCard?.id === 'horn' && session.clockCard.turn === session.turn)
    || (session.intel?.card === 'K' && session.turn === 1);
  // The Break-in: while the alarm is 0, enemies are sentries (phase 6, after ACOLYTE).
  const sentry = session.soloScenario?.id === 'solo-break-in' && session.alarm === 0;
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

  function rollSentry() {
    const roll = 1 + Math.floor(Math.random() * 6);
    const text = roll <= 2 ? 'moves a normal move toward your nearest model.'
      : roll === 3 ? 'moves a normal move in a random direction.'
      : roll === 4 ? 'stays where it is.'
      : 'is yours to move: a normal move wherever you like. It does not charge or shoot.';
    update({ events: [{ id: generateId(), turn: session.turn, text: `Sentry ${name} — D6 ${roll}: ${text}` }, ...session.events] });
  }

  if (sentry) {
    const last = session.events.find(e => e.turn === session.turn && e.text.startsWith(`Sentry ${name} — `));
    return (
      <div className="space-y-1">
        <p className="font-ui">Sentry</p>
        <p className="font-body text-xs text-ink-faded">1–2 toward your nearest model · 3 random direction · 4 stays · 5–6 you move it. A sentry does not attack.</p>
        {last ? <p className="font-body text-xs">{last.text}</p> : <button className="min-h-[44px] underline font-ui" onClick={rollSentry}>Roll sentry</button>}
      </div>
    );
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
