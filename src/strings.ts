// The per-system string table (spec §4). The engine and DB use system-agnostic
// field names; every user-facing word resolves through here at render time, so
// no system's vocabulary is ever hard-coded in shared code or stored in a DB
// value. When the shared UI is vendored in, it reads from this table exactly as
// Mordheim Manager reads from its own.
//
// Every label below is SOURCED from the Mord Hive v0.5 rulebook (§4). Note the
// correction the spec calls out: the book says "warband", not "gang" — the
// earlier candidate was wrong, which is exactly why §3.3/§8 flags rather than
// guesses.

export const strings = {
  appName: 'Mord Hive',
  tagline: 'Warband & campaign bookkeeping for the hive',
  // Unofficial fan-tool framing, carried throughout (§8).
  fanNotice:
    'An unofficial fan tool for Mord Hive (v0.5 WIP), a fan-made ruleset. Not affiliated with or endorsed by Games Workshop.',

  // §4 terminology map — the generic field → its Mord Hive label.
  terms: {
    roster: 'Warband',
    rosterPlural: 'Warbands',
    leader: 'Leader',
    hero: 'Hero',
    heroPlural: 'Heroes',
    henchman: 'Henchman',
    henchmanPlural: 'Henchmen',
    warrior: 'Warrior',
    rawRecruit: 'Raw recruit',
    salvageResource: 'Diamantine', // wyrdstone-shards analogue
    salvageUnit: 'shards',
    treasure: 'Archaeotech', // mythical discovered tech
    hiredSpecialist: 'Hired Gun',
    hiredSpecialistPlural: 'Hired Guns',
    postBattleIncome: 'Exploration Phase',
    rating: 'Warband rating',
    currency: 'Thrones',
    currencyAbbr: 'tn',
    wargear: 'Wargear',
    // Build constraints, sourced from v0.5 (§3).
    startingBudget: 500, // tn — every warband builds to 500 tn
    minModels: 3,
    maxHeroes: 6,
  },

  nav: {
    appShort: 'Mord Hive',
    home: 'Home',
    warbands: 'Warbands',
    battle: 'Battle',
    trading: 'Trading',
    campaign: 'Campaign',
    rules: 'Rules',
    settings: 'Account',
    design: 'Design',
    signIn: 'Sign in',
    signOut: 'Sign out',
  },

  theme: {
    label: 'Appearance',
    paper: 'Paper',
    paperHint: 'The printed page — light. Default; easiest under bright light.',
    plated: 'Plated',
    platedHint: 'The metal, lit low — dark.',
  },
} as const;

export type Strings = typeof strings;
