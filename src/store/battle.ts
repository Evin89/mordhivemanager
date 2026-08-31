// The table-side battle session: what's set up for a game and what happens
// during it. Persisted to localStorage keyed per warband, so an accidental
// refresh at the game store doesn't lose the turn count, the event log or the
// casualty tally (spec §5 / MM §22). One in-progress battle per warband.
//
// Shapes mirror Mordheim Manager's BattleSession so the post-battle wizard,
// when it lands, reads the same tally it does there.

import { Warband } from '../types';
import { NpcAgenda } from '../lib/npc';

export type BattleEvent = {
  id: string;
  turn: number;
  text: string;
};

/**
 * Who went out of action, recorded as it happens. Heroes are single models
 * (a set of ids); a Henchmen group is N models behind one card, so what's
 * answerable is *how many* went down — a count per group id. The post-battle
 * Injuries step wants exactly these two shapes.
 */
export type OutOfActionTally = {
  heroIds: string[];
  henchmenCounts: Record<string, number>;
};

export type BattleSession = {
  warbandId: string;
  scenario: string;
  opponentWarbandId: string | null;
  opponentName: string;
  /** Set once the fight has started (from the pre-battle screen). */
  started: boolean;
  turn: number;
  events: BattleEvent[];
  notes: string;
  outOfAction: OutOfActionTally;
  /**
   * An app-built AI opponent for a solo game (spec §6), generated from a sourced
   * warband list. Stored as a full Warband so the tracker renders its roster the
   * same way it renders yours. Its casualties live in `npcOutOfAction`.
   *
   * The AI's behaviour and difficulty are app-original, NOT part of the Mord Hive
   * ruleset — surfaced as suggestions and badged as such.
   */
  npcWarband: Warband | null;
  npcOutOfAction: OutOfActionTally;
  /** The AI opponent's temperament and hidden objective (revealed at battle end). */
  npcAgenda: NpcAgenda | null;
  npcAgendaRevealed: boolean;
  /** Seed for the generated SVG battlefield; null until a map is rolled. */
  battlefieldSeed: number | null;
};

export function defaultBattleSession(warbandId: string): BattleSession {
  return {
    warbandId,
    scenario: '',
    opponentWarbandId: null,
    opponentName: '',
    started: false,
    turn: 1,
    events: [],
    notes: '',
    outOfAction: { heroIds: [], henchmenCounts: {} },
    npcWarband: null,
    npcOutOfAction: { heroIds: [], henchmenCounts: {} },
    npcAgenda: null,
    npcAgendaRevealed: false,
    battlefieldSeed: null,
  };
}

const keyFor = (warbandId: string) => `mordhive.battle.${warbandId}`;

export function loadBattleSession(warbandId: string): BattleSession | undefined {
  try {
    const raw = localStorage.getItem(keyFor(warbandId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as BattleSession;
    // Merge onto the default so a session written by an older shape still loads.
    return { ...defaultBattleSession(warbandId), ...parsed, warbandId };
  } catch {
    return undefined;
  }
}

export function saveBattleSession(session: BattleSession): void {
  try {
    localStorage.setItem(keyFor(session.warbandId), JSON.stringify(session));
  } catch {
    /* best-effort; the session still lives in the screen's state this visit */
  }
}

export function clearBattleSession(warbandId: string): void {
  try {
    localStorage.removeItem(keyFor(warbandId));
  } catch {
    /* ignore */
  }
}

export function hasActiveBattle(warbandId: string): boolean {
  return loadBattleSession(warbandId)?.started === true;
}
