import { useState } from 'react';
import Plate from './Plate';
import { Button, Select } from './ui';
import {
  askYesNo,
  rollReaction,
  rollHiveEvent,
  Likelihood,
  LIKELIHOOD_LABELS,
} from '../lib/oracle';

/**
 * The solo oracle panel (spec §6): a yes/no with likelihood, a reaction roll,
 * and a random hive event — for the calls a solo player has no opponent to make.
 * Results can be dropped into the battle log. App-original, not ruleset content.
 */
export default function Oracle({ onLog }: { onLog?: (text: string) => void }) {
  const [likelihood, setLikelihood] = useState<Likelihood>('fifty');
  const [answer, setAnswer] = useState<string | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [event, setEvent] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="font-body text-ink-faded text-xs px-1">
        A solo dice helper for the calls no opponent is here to make. App-original, not part of the ruleset.
      </p>

      {/* Yes / No */}
      <Plate className="p-3 space-y-2">
        <p className="font-display uppercase tracking-[0.06em] text-ink text-sm">Ask a Yes / No</p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="block flex-1 min-w-[9rem]">
            <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Likelihood</span>
            <Select value={likelihood} onChange={(e) => setLikelihood(e.target.value as Likelihood)}>
              {(Object.keys(LIKELIHOOD_LABELS) as Likelihood[]).map((k) => (
                <option key={k} value={k}>{LIKELIHOOD_LABELS[k]}</option>
              ))}
            </Select>
          </label>
          <Button
            size="dense"
            fullWidth={false}
            onClick={() => {
              const a = askYesNo(likelihood);
              const text = `Oracle (${LIKELIHOOD_LABELS[likelihood]}, d6=${a.roll}): ${a.text}`;
              setAnswer(text);
              onLog?.(text);
            }}
          >
            Roll
          </Button>
        </div>
        {answer && <p className="font-body text-ink text-body-min">&gt; {answer}</p>}
      </Plate>

      {/* Reaction */}
      <Plate className="p-3 space-y-2">
        <p className="font-display uppercase tracking-[0.06em] text-ink text-sm">Reaction (2D6)</p>
        <Button
          size="dense"
          variant="secondary"
          fullWidth={false}
          onClick={() => {
            const r = rollReaction();
            const text = `Reaction (2d6=${r.roll}): ${r.label} — ${r.text}`;
            setReaction(text);
            onLog?.(text);
          }}
        >
          Roll reaction
        </Button>
        {reaction && <p className="font-body text-ink text-body-min">&gt; {reaction}</p>}
      </Plate>

      {/* Hive event */}
      <Plate className="p-3 space-y-2">
        <p className="font-display uppercase tracking-[0.06em] text-ink text-sm">Hive Event (D66)</p>
        <Button
          size="dense"
          variant="secondary"
          fullWidth={false}
          onClick={() => {
            const ev = rollHiveEvent();
            const text = `Hive event (D66=${ev.roll}): ${ev.text}`;
            setEvent(text);
            onLog?.(text);
          }}
        >
          Roll event
        </Button>
        {event && <p className="font-body text-ink text-body-min">&gt; {event}</p>}
      </Plate>
    </div>
  );
}
