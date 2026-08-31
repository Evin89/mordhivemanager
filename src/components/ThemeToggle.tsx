import { useEffect, useState } from 'react';
import { applyTheme, getTheme, Theme } from '../lib/theme';
import { strings } from '../strings';

/**
 * Paper / Plated switch (§2.6). Reflects the theme applied at first paint by the
 * inline script in index.html, then drives it thereafter.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div
      className="inline-flex border border-steel bg-plate"
      role="group"
      aria-label={strings.theme.label}
    >
      {(['paper', 'plated'] as const).map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            aria-pressed={active}
            title={t === 'paper' ? strings.theme.paperHint : strings.theme.platedHint}
            className={`px-3 py-1.5 font-display uppercase tracking-[0.06em] text-sm min-h-[44px] ${
              active ? 'bg-banner text-on-banner' : 'text-ink hover:bg-page'
            }`}
          >
            {t === 'paper' ? strings.theme.paper : strings.theme.plated}
          </button>
        );
      })}
    </div>
  );
}
