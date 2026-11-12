import { useEffect, useState } from 'react';
import { BattleRow, deleteBattle, loadBattles } from '../lib/battles';
import BannerHeader from './BannerHeader';
import Plate from './Plate';
import PageChip from './PageChip';
import { Button } from './ui';

const RESULT_LABEL = { win: 'Win', draw: 'Draw', loss: 'Loss' } as const;

/** Rating after each battle, oldest → newest, as a plain line. No chart library. */
function RatingLine({ rows }: { rows: BattleRow[] }) {
  const points = [...rows].reverse().map((r) => r.ratingAfter);
  if (points.length < 2) return null;
  const w = 320;
  const h = 64;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (w - 8) + 4, h - 6 - ((p - min) / span) * (h - 12)] as const);
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" role="img" aria-label={`Rating over ${points.length} battles, from ${points[0]} to ${points[points.length - 1]}`}>
        <polyline
          points={xy.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="rgb(var(--color-ink))"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="rgb(var(--color-ink))" />
        ))}
      </svg>
      <figcaption className="flex justify-between font-display text-xs tabular-nums text-ink-faded">
        <span>{points[0]}</span>
        <span>Rating over {points.length} battles</span>
        <span>{points[points.length - 1]}</span>
      </figcaption>
    </figure>
  );
}

/** The warband's battles, newest first, with its rating line (MM §18.3, §34). */
export default function BattleHistory({ warbandId }: { warbandId: string }) {
  const [rows, setRows] = useState<BattleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    loadBattles(warbandId).then((res) => {
      if (!active) return;
      setRows(res.rows);
      setError(res.error);
    });
    return () => {
      active = false;
    };
  }, [warbandId]);

  const record = rows?.reduce((t, r) => ({ ...t, [r.result]: t[r.result] + 1 }), { win: 0, draw: 0, loss: 0 });
  const visible = showAll ? rows ?? [] : (rows ?? []).slice(0, 5);

  return (
    <section className="space-y-3">
      <BannerHeader trailing={record ? <PageChip className="border-on-banner/40">{record.win}-{record.draw}-{record.loss}</PageChip> : undefined}>
        Battles
      </BannerHeader>
      {error && <p className="font-body text-ink text-sm px-1">{error}</p>}
      {rows === null ? (
        <p className="font-body text-ink-faded text-sm px-1">Loading battles…</p>
      ) : rows.length === 0 ? (
        <p className="font-body text-ink-faded text-sm px-1">No battles yet. They're added when you finish the post-battle sequence.</p>
      ) : (
        <Plate className="p-4 space-y-4">
          <RatingLine rows={rows} />
          <ul className="divide-y divide-steel-l">
            {visible.map((r) => (
              <li key={r.id} className="py-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="min-w-0">
                  <span className="font-display uppercase tracking-[0.04em] text-ink text-sm mr-2">{RESULT_LABEL[r.result]}</span>
                  <span className="font-body text-ink">{r.scenario || 'Battle'}</span>
                  {r.opponent && <span className="font-body text-ink-faded"> · vs {r.opponent}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-display text-xs tabular-nums text-ink-faded">{r.playedOn} · rating {r.ratingAfter}</span>
                  <button
                    type="button"
                    className="font-display text-xs underline underline-offset-4 min-h-[44px]"
                    onClick={async () => {
                      if (!window.confirm('Remove this battle from the history? The warband itself is not changed.')) return;
                      const err = await deleteBattle(r.id);
                      if (err) setError(err);
                      else setRows((prev) => (prev ?? []).filter((x) => x.id !== r.id));
                    }}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {rows.length > 5 && (
            <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${rows.length}`}
            </Button>
          )}
        </Plate>
      )}
    </section>
  );
}
