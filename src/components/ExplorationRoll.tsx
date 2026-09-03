import { useState } from 'react';
import Plate from './Plate';
import { Button } from './ui';
import { strings } from '../strings';
import { rollDice, resolveExploration, MAX_DICE_KEPT, ExplorationLocation } from '../lib/exploration';

const { terms } = strings;

type ExplorationRollProps = {
  /** Heroes who survived without going out of action (the base dice). */
  survivingHeroes: number;
  won: boolean;
  /** Fires whenever a result is resolved: the flat shards from the total, and
   * the location found (for the player to apply its loot by hand). */
  onResult: (shards: number, location: ExplorationLocation | undefined) => void;
};

/**
 * The Exploration roller (spec §3 Income). Rolls the warband's dice pool
 * (surviving Heroes + 1 if won, adjustable for skills/gear), keeps the highest
 * six, offers the v0.5 built-in single re-roll, then reads the shards off the
 * total and surfaces any location found. Shards are applied to income
 * automatically; a location's loot is shown for the player to add by hand.
 */
export default function ExplorationRoll({ survivingHeroes, won, onResult }: ExplorationRollProps) {
  const [pool, setPool] = useState(survivingHeroes + (won ? 1 : 0));
  const [dice, setDice] = useState<number[] | null>(null);
  const [rerollUsed, setRerollUsed] = useState(false);

  const outcome = dice ? resolveExploration(dice) : null;
  // The indices of the dice that get dropped: the lowest (rolled - 6).
  const droppedIndices = (() => {
    if (!dice || dice.length <= MAX_DICE_KEPT) return new Set<number>();
    const byValueAsc = dice.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    return new Set(byValueAsc.slice(0, dice.length - MAX_DICE_KEPT).map((d) => d.i));
  })();

  function roll() {
    const d = rollDice(pool);
    setDice(d);
    setRerollUsed(false);
    const res = resolveExploration(d);
    onResult(res.shards, res.location);
  }

  function rerollAt(index: number) {
    if (!dice || rerollUsed) return;
    const next = [...dice];
    next[index] = 1 + Math.floor(Math.random() * 6);
    setDice(next);
    setRerollUsed(true);
    const res = resolveExploration(next);
    onResult(res.shards, res.location);
  }

  return (
    <div className="space-y-3">
      {/* Dice pool */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-ink text-body-min">Exploration dice</span>
        <span className="flex items-center gap-2">
          <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setPool((p) => Math.max(1, p - 1))} aria-label="One fewer die">−</Button>
          <span className="font-display tabular-nums text-ink w-6 text-center">{pool}</span>
          <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setPool((p) => p + 1)} aria-label="One more die">+</Button>
        </span>
      </div>
      <p className="font-body text-ink-faded text-xs">
        Default is one die per surviving Hero{won ? ' + 1 for the win' : ''}. Adjust for skills or gear (e.g. a Mord Hive Cartograph). Only the highest {MAX_DICE_KEPT} count.
      </p>

      <Button onClick={roll}>{dice ? 'Roll again' : 'Roll exploration'}</Button>

      {dice && outcome && (
        <Plate className="p-3 space-y-2">
          {/* Dice — kept ones solid, dropped ones faded; click one to re-roll (once). */}
          <div className="flex flex-wrap gap-1.5">
            {dice.map((v, i) => {
              const isKept = !droppedIndices.has(i);
              return (
                <button
                  key={i}
                  onClick={() => rerollAt(i)}
                  disabled={rerollUsed}
                  title={rerollUsed ? 'Re-roll already used' : 'Re-roll this die (once)'}
                  className={`w-9 h-9 border-2 font-display tabular-nums text-lg ${
                    isKept ? 'border-ink bg-plate text-ink' : 'border-steel bg-page text-ink-faded'
                  } ${rerollUsed ? 'opacity-70' : 'hover:border-banner'}`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          {!rerollUsed && (
            <p className="font-body text-ink-faded text-xs">Tap a die to use your one built-in re-roll.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="font-body text-ink text-body-min">
              Total <strong className="tabular-nums">{outcome.total}</strong> →{' '}
              <strong>{outcome.shards}</strong> {terms.salvageResource} {outcome.shards === 1 ? 'shard' : 'shards'}
            </span>
          </div>

          {outcome.location && (
            <div className="border-t border-steel-l pt-2">
              <p className="font-display uppercase tracking-[0.05em] text-ink text-sm">
                {outcome.location.combination} · {outcome.location.name}
              </p>
              <p className="font-body text-ink text-body-min mt-1 leading-relaxed">{outcome.location.effect}</p>
              <p className="font-body text-ink-faded text-xs mt-1">
                Apply this location's loot yourself — add any thrones below and note gear/effects in the warband.
              </p>
            </div>
          )}
        </Plate>
      )}
    </div>
  );
}
