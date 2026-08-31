import { ReactNode } from 'react';

type BannerHeaderProps = {
  children: ReactNode;
  /** Optional trailing content — a page chip, an action — right-aligned. */
  trailing?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
};

/**
 * The black banner header (spec §2.5) — the rulebook's "Rules"-style title bar:
 * a solid black rectangle, white Oxanium, used for every major section title.
 * The banners and the frame are the loud part of the Codex identity, so
 * everything they wrap stays quiet.
 */
export default function BannerHeader({ children, trailing, as = 'h2', className = '' }: BannerHeaderProps) {
  const Tag = as;
  return (
    <div className={`flex items-stretch ${className}`}>
      <div className="flex flex-1 items-center justify-between gap-3 bg-banner px-4 py-2">
        <Tag className="font-display uppercase tracking-[0.06em] text-on-banner text-lg leading-tight">
          {children}
        </Tag>
        {trailing && <div className="text-on-banner shrink-0">{trailing}</div>}
      </div>
    </div>
  );
}
