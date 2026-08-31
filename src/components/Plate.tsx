import { ReactNode } from 'react';

type PlateProps = {
  children: ReactNode;
  className?: string;
};

/**
 * A riveted steel plate (spec §2.5) — a 2px gunmetal border with a bolt at each
 * corner, the base container for datasheets, cards and boxouts. The bolts and
 * bevel are drawn entirely in CSS (`.plated-frame` in index.css), so a card
 * opts in with one class and no extra markup. No skulls, no GW marks — the §2
 * IP line: the industrial frame is reproduced, the rulebook's corner skulls are
 * replaced with plain bolt plates.
 */
export default function Plate({ children, className = '' }: PlateProps) {
  return <div className={`plated-frame bg-plate ${className}`}>{children}</div>;
}
