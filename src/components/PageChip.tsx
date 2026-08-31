import { ReactNode } from 'react';

/**
 * The page-number chip (spec §2.5) — a small bolted box for framed labels
 * (a page reference, a rating, a count). Oxanium, tabular figures, sits inside
 * a thin steel frame with a single rivet.
 */
export default function PageChip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border border-steel bg-plate px-2 py-0.5 font-display text-ink text-sm tabular-nums lining-nums ${className}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-bolt" aria-hidden="true" />
      {children}
    </span>
  );
}
