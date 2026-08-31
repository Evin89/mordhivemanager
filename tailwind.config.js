/** @type {import('tailwindcss').Config} */

// Codex skin (spec §2). Same mechanism as Mordheim Manager: every colour
// resolves through a CSS variable so a theme is a set of values, not a rewrite
// of the utility classes. That's what lets the shared UI be vendored in and
// reskinned by redefining variables in index.css rather than editing components.
const themed = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Shared role tokens (names inherited from Mordheim Manager) ---
        // Kept identical so vendored components using `text-ink` / `bg-parchment`
        // / `bg-blood` land in the Codex palette without edits. Under the Codex
        // skin `parchment` is the printed page, `accent` is the black banner
        // (the source has no spot colour, §2.2), and `verdigris` is neutral steel.
        ink: {
          DEFAULT: themed('ink'),
          950: themed('ink-950'),
          900: themed('ink-900'),
          800: themed('ink-800'),
          700: themed('ink-700'),
        },
        'ink-faded': themed('ink-faded'),
        bone: {
          100: themed('bone-100'),
          200: themed('bone-200'),
          300: themed('bone-300'),
          400: themed('bone-400'),
        },
        ember: {
          400: themed('ember-400'),
          500: themed('ember-500'),
          600: themed('ember-600'),
        },
        blood: {
          DEFAULT: themed('accent'),
          500: themed('blood-500'),
          600: themed('blood-600'),
        },
        parchment: {
          DEFAULT: themed('parchment'),
          raised: themed('parchment-raised'),
        },
        'on-accent': themed('on-accent'),
        verdigris: themed('verdigris'),

        // --- Codex-specific tokens (spec §2.1) ---
        // The industrial frame. `page`/`plate` alias the surfaces above under
        // their Codex names; the steel triplet and bolt are the frame plating.
        page: themed('parchment'),
        plate: themed('parchment-raised'),
        banner: themed('banner'),
        'on-banner': themed('on-banner'),
        steel: {
          DEFAULT: themed('steel'),
          d: themed('steel-d'),
          l: themed('steel-l'),
        },
        bolt: themed('bolt'),
      },

      // Spec §2.3: Oxanium (rounded techno) for all display/UI/data, Spectral
      // (serif) for running body prose. The generic family *roles* keep MM's
      // names so vendored `font-heading` / `font-display` classes resolve here.
      fontFamily: {
        display: ['Oxanium', 'system-ui', 'sans-serif'],
        heading: ['Oxanium', 'system-ui', 'sans-serif'],
        'heading-sc': ['Oxanium', 'system-ui', 'sans-serif'],
        body: ['Spectral', 'Georgia', 'serif'],
        ui: ['Oxanium', 'system-ui', 'sans-serif'],
      },

      // §2.6 / MM §5.4 readability floors, as named sizes a screen can't undercut.
      fontSize: {
        'stat-min': ['0.875rem', { lineHeight: '1.1' }], // 14px — statline numbers
        'body-min': ['1rem', { lineHeight: '1.5' }], // 16px — running text
      },
    },
  },
  plugins: [],
};
