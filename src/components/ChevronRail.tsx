/**
 * A chevron rail (spec §2.5) — a slim industrial band for section edges.
 *
 * §2.5 carries a scar: the first attempt used a full-height flex chevron band
 * and blew up to fill the screen on mobile. This is deliberately a fixed 10px
 * bar (`.chevron-rail` in index.css) that never flexes. If in doubt the spec
 * says omit it — the black banners already punctuate sections — so it's a thin
 * opt-in accent, never load-bearing.
 */
export default function ChevronRail({ className = '' }: { className?: string }) {
  return <div className={`chevron-rail ${className}`} aria-hidden="true" />;
}
