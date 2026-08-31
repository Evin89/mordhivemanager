// Codex theming (spec §2.6). Two themes on the shared data-theme architecture;
// Paper (light) is the default and the one Mord Hive diverges from Mordheim's
// dark-default on. Stored per device (localStorage), like MM — reading at a
// bright game-store table is a different problem from reading at home, and the
// choice shouldn't follow the account to another screen.
//
// The no-flash application at first paint lives inline in index.html and
// duplicates the STORAGE_KEY below on purpose; keep the two in sync.

export type Theme = 'paper' | 'plated';

const STORAGE_KEY = 'mordhive.theme';
const THEME_COLOR = { paper: '#E9E9E6', plated: '#161719' } as const;

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'paper' || t === 'plated') return t;
  } catch {
    /* private mode / disabled storage — fall through to the default */
  }
  return 'paper';
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'plated');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* best-effort; the theme still applies for this session */
  }
}
