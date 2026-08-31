import { ReactNode } from 'react';

type DesignerNoteProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

/**
 * The designer's-note boxout (spec §2.5) — a bordered box with an underlined
 * Oxanium heading, echoing the rulebook's own "Mord Hive Designer's Note". Used
 * for the version-risk / homebrew-discipline notes the content files carry
 * (§3), so an unverified or moving-target rule is flagged in the book's own idiom
 * rather than hidden.
 */
export default function DesignerNote({ title = "Designer's Note", children, className = '' }: DesignerNoteProps) {
  return (
    <aside className={`border-2 border-steel bg-plate px-4 py-3 ${className}`}>
      <p className="font-display uppercase tracking-[0.08em] text-ink text-sm underline underline-offset-4 decoration-2 mb-1.5">
        {title}
      </p>
      <div className="font-body text-ink text-body-min leading-relaxed">{children}</div>
    </aside>
  );
}
