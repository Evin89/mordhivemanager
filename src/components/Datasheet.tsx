import { ReactNode } from 'react';
import { StatLine } from '../types';
import Plate from './Plate';
import Portrait from './Portrait';
import ProfileBlock from './ProfileBlock';

export type DatasheetProps = {
  /** Unit name, shown in the black banner header. */
  name: string;
  hero?: boolean;
  leader?: boolean;
  xp?: number;
  /** Optional sub-line under the name — a type or tier label. */
  subtitle?: string;
  stats: StatLine;
  maximums?: StatLine;
  showMaximums?: boolean;
  /** Optional wargear line beneath the statline (§2.4). */
  wargear?: string;
  /** Optional trailing content in the banner — a rating chip, a cost. */
  headerTrailing?: ReactNode;
  className?: string;
};

/**
 * The datasheet (spec §2.4) — the codex army-list entry: a black banner header
 * with the unit name, a black-ruled statline beneath, an optional wargear line,
 * the whole card sitting in a bolted steel plate. This is the signature Codex
 * component and the shape the print sheet and roster rows are laid out after.
 */
export default function Datasheet({
  name,
  hero = false,
  leader = false,
  xp,
  subtitle,
  stats,
  maximums,
  showMaximums = false,
  wargear,
  headerTrailing,
  className = '',
}: DatasheetProps) {
  return (
    <Plate className={`${className} ${leader ? "leader-card" : ""}`}>
      {leader && <img className="leader-seal" src="/img/seal.png" alt="" aria-hidden="true" />}
      {/* Black banner header — the unit name, in Oxanium on black. */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {hero && <Portrait />}
        <div className="min-w-0 flex-1">
          <h3 className="font-display uppercase tracking-[0.05em] text-heading text-[25px] leading-tight truncate">
            {name}
          </h3>
          {subtitle && (
            <p className="font-body text-secondary text-base italic truncate">
              {subtitle}
            </p>
          )}
        </div>
        {xp !== undefined && <span className="font-ui font-bold text-brass-text pr-8">{xp} XP</span>}
        {headerTrailing && <div className="shrink-0 text-on-banner">{headerTrailing}</div>}
      </div>

      <div className="p-3 sm:p-4">
        <ProfileBlock stats={stats} maximums={maximums} showMaximums={showMaximums} />
        {wargear && (
          <p className="mt-3 font-body text-ink text-body-min leading-relaxed">
            <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs mr-2">
              Wargear
            </span>
            {wargear}
          </p>
        )}
      </div>
    </Plate>
  );
}
