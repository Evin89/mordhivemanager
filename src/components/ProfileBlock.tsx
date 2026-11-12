import { STAT_KEYS } from '../lib/statLine';
import { StatLine } from '../types';

export type ProfileBlockProps = {
  stats: StatLine;
  /** Racial maximums, when known. A value at its cap is marked. */
  maximums?: StatLine;
  /** `full` for detail screens, `collapsed` for roster rows (§2.4 / MM §5.3). */
  variant?: 'full' | 'collapsed';
  /** Optional caption above the table — a unit type, usually. */
  label?: string;
  showMaximums?: boolean;
  /** Supply to make the cells editable in place (the detail screens correct
   * stats here rather than in a lookalike grid that would drift from this one). */
  onStatChange?: (key: keyof StatLine, value: number) => void;
};

/**
 * The statline table — the one component the whole Codex design language rests
 * on (spec §2.4), the codex analogue of Mordheim's profile block (MM §5.3).
 *
 * Reskin deltas from MM's ProfileBlock:
 * - Fully BLACK-RULED, not hairline. §2.4: "the book's tables are fully
 *   black-ruled on white, not hairline". So every gridline is `border-ink`
 *   (2px frame, black cell dividers) rather than the thin inner ring MM drew.
 * - Oxanium condensed headers (`font-display`) instead of blackletter small-caps.
 *
 * Structure carries over unchanged (and is why it can be vendored later):
 * - A real `<table>`, so a screen reader announces "WS 4", not a bare "4".
 * - `tabular-nums lining-nums`: a nine-column numeric row can't wobble.
 * - Cell padding shrinks on narrow screens, never the font size — the §2.6/§5.4
 *   14px statline floor is fixed and only the gaps give.
 * - `collapsed` differs in density, never width; both fill their container.
 */
export default function ProfileBlock({
  stats,
  maximums,
  variant = 'full',
  label,
  showMaximums = false,
  onStatChange,
}: ProfileBlockProps) {
  const collapsed = variant === 'collapsed';
  const editable = onStatChange !== undefined;

  return (
    <div className={collapsed ? 'statline block' : 'statline w-full'}>
      {label && (
        <p className="font-display text-ink text-stat-min uppercase tracking-[0.08em] mb-1">{label}</p>
      )}

      {/* 2px black frame; black cell dividers come from the cell borders below. */}
      <div className="border-2 border-ink bg-plate">
        <table className="w-full border-collapse tabular-nums lining-nums">
          <thead>
            <tr>
              {STAT_KEYS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className={`font-display text-ink border-b-2 border-ink border-r border-ink last:border-r-0 font-semibold uppercase tracking-[0.03em] text-stat-min ${
                    collapsed ? 'px-1 py-0.5 sm:px-3 sm:py-1.5' : 'px-1.5 py-1 sm:px-3 sm:py-1.5'
                  }`}
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {STAT_KEYS.map((key) => {
                const value = stats[key];
                const max = maximums?.[key];
                const atMax = max !== undefined && value >= max;
                return (
                  <td
                    key={key}
                    className={`font-body text-ink text-center text-stat-min border-r border-ink last:border-r-0 ${
                      collapsed ? 'px-1 py-0.5 sm:px-3 sm:py-1.5' : 'px-1.5 py-1.5 sm:px-3 sm:py-2 sm:text-base'
                    } ${atMax ? 'font-bold' : ''}`}
                    title={atMax && max !== undefined ? `At racial maximum (${max})` : undefined}
                  >
                    {editable ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={key}
                        value={Number.isNaN(value) ? '' : value}
                        min={0}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10);
                          onStatChange!(key, Number.isNaN(next) ? 0 : Math.max(0, next));
                        }}
                        className="w-full min-h-[44px] bg-transparent text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-banner"
                      />
                    ) : (
                      value
                    )}
                    {atMax && <span className="sr-only"> (at maximum)</span>}
                  </td>
                );
              })}
            </tr>
            {showMaximums && maximums && (
              <tr>
                {STAT_KEYS.map((key) => (
                  <td
                    key={key}
                    className={`font-ui text-ink-faded border-t border-ink/40 border-r border-ink/40 last:border-r-0 text-center text-xs ${
                      collapsed ? 'px-1 py-0.5 sm:px-3 sm:py-1' : 'px-1.5 py-1 sm:px-3'
                    }`}
                  >
                    <span className="sr-only">Maximum </span>
                    {maximums[key]}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
