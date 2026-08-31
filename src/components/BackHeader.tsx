import { useNavigate } from 'react-router-dom';

/**
 * A screen title bar with a back control, in the Codex black-banner style
 * (spec §2.5). Mirrors Mordheim Manager's BackHeader so the build screens
 * vendor across; back goes to the previous history entry.
 */
export default function BackHeader({ title, to }: { title: string; to?: string }) {
  const navigate = useNavigate();
  return (
    <div className="bg-banner flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        onClick={() => (to ? navigate(to) : navigate(-1))}
        aria-label="Back"
        className="text-on-banner font-display text-lg px-2 py-1 min-h-[44px] hover:opacity-80"
      >
        ‹
      </button>
      <h1 className="font-display uppercase tracking-[0.05em] text-on-banner text-lg">{title}</h1>
    </div>
  );
}
