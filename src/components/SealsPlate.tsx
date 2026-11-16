import { useEffect, useRef, useState } from 'react';
import { Warband } from '../types';
import { BattleRow } from '../lib/battles';
import { earnedSeals, seals, SealId } from '../lib/seals';
import Plate from './Plate';

export default function SealsPlate({ warband, battles, historyAvailable = true }: { warband: Warband; battles: BattleRow[]; historyAvailable?: boolean }) {
  const processed = useRef<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [stamped, setStamped] = useState<SealId[]>([]);
  const earned = earnedSeals(warband, battles);
  const signature = earned.join(',');

  useEffect(() => {
    const revision = `${warband.id}:${signature}`;
    if (processed.current === revision) return;
    processed.current = revision;
    const key = `mordhive.seals.seen.${warband.id}`;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      const seen = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
      const current = signature ? signature.split(',') as SealId[] : [];
      setStamped(current.filter(id => !seen.includes(id)));
      localStorage.setItem(key, JSON.stringify([...new Set([...seen, ...current])]));
    } catch {
      // Storage can be disabled; honours remain readable without persistence.
      setStamped([]);
    }
  }, [warband.id, signature]);

  const ordered = seals.filter(seal => historyAvailable || ['hoard', 'scarred', 'storied'].includes(seal.id)).sort((a, b) => Number(earned.includes(b.id)) - Number(earned.includes(a.id)));
  return (
    <Plate className="p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-heading text-3xl">Seals</h2>
        <button type="button" className="btn btn-s min-h-[44px]" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>
          {showAll ? 'Show earned' : 'Show all'}
        </button>
      </div>
      {earned.length === 0 && !showAll && <p className="font-body text-ink-faded mt-3">No seals earned yet.</p>}
      <ul className="grid gap-4 sm:grid-cols-2 mt-4">
        {ordered.filter(seal => showAll || earned.includes(seal.id)).map(seal => {
          const unlocked = earned.includes(seal.id);
          return (
            <li key={seal.id} className="flex items-center gap-3">
              {unlocked ? (
                <img className={`earned-seal ${stamped.includes(seal.id) ? 'seal-stamp' : ''}`} src="/img/seal-wax.png" width="56" height="56" alt="" />
              ) : <span className="unearned-seal" aria-hidden="true" />}
              <div>
                <h3 className="font-ui text-brass-text text-lg">{seal.name}</h3>
                <p className="font-body text-ink text-sm">{unlocked ? seal.line : seal.condition}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Plate>
  );
}
