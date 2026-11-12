import { supabase } from './supabase';
import { BattleRecord, BattleResult, Warband } from '../types';
import { PostBattleDraft } from './postBattle';
import { BattleSession } from '../store/battle';

// Battle history (mh_0003). Written once, when the post-battle sequence is
// confirmed; read on the roster as "Battles" and as the rating line.

export type BattleRow = {
  id: string;
  playedOn: string;
  result: BattleResult;
  scenario: string;
  opponent: string;
  ratingAfter: number;
  campaignId: string | null;
  record: BattleRecord;
};

const today = () => new Date().toISOString().slice(0, 10);
const flip = (r: BattleResult): BattleResult => (r === 'win' ? 'loss' : r === 'loss' ? 'win' : 'draw');

function opponentName(session: BattleSession | undefined, warbands: Warband[]): string {
  if (!session) return '';
  if (session.npcWarband) return `${session.npcWarband.name} (solo)`;
  const mine = warbands.find((w) => w.id === session.opponentWarbandId);
  return (mine?.name ?? session.opponentName ?? '').slice(0, 120);
}

/**
 * Saves the battle to the warband's history, and — when the warband is linked
 * to a campaign — to that campaign's shared battle log too. Returns an error
 * message, or null. The warband itself has already been saved by then, so a
 * failure here loses the history line, never the roster changes.
 */
export async function recordBattle(args: {
  before: Warband;
  after: Warband;
  ratingAfter: number;
  draft: PostBattleDraft;
  session: BattleSession | undefined;
  myWarbands: Warband[];
}): Promise<string | null> {
  const { before, after, ratingAfter, draft, session, myWarbands } = args;

  const modelsLost =
    after.heroes.filter((h) => h.status === 'dead').length -
    before.heroes.filter((h) => h.status === 'dead').length +
    Object.values(draft.henchmen).reduce((s, g) => s + g.diedCount, 0) +
    Object.values(draft.hired ?? {}).filter((h) => h.lost).length;

  const opponent = opponentName(session, myWarbands);
  const record: BattleRecord = {
    id: crypto.randomUUID?.() ?? `${Date.now()}`,
    warbandId: before.id,
    date: today(),
    scenario: session?.scenario ?? '',
    opponents: opponent ? [opponent] : [],
    result: draft.result,
    wyrdstoneFound: draft.diamantineFound,
    goldChange: after.gold - before.gold,
    casualtiesSummary: '',
    modelsLost: Math.max(0, modelsLost),
    enemiesTakenOut: draft.enemiesTakenOut,
    notes: draft.notes,
  };

  // The warband's campaign, read fresh: the store doesn't hold the link.
  const { data: link } = await supabase.from('warbands').select('campaign_id').eq('id', before.id).maybeSingle();
  const campaignId = (link?.campaign_id as string | null) ?? null;

  const { error } = await supabase.from('battles').insert({
    warband_id: before.id,
    campaign_id: campaignId,
    played_on: record.date,
    result: record.result,
    scenario: record.scenario.slice(0, 120),
    opponent,
    rating_after: ratingAfter,
    data: record,
  });
  if (error) return `The battle wasn't added to the history: ${error.message}`;

  if (campaignId && !session?.npcWarband) {
    // Your side, plus the opponent when it's one of your own warbands in the
    // same campaign (two of your own warbands fighting at one table).
    const participants = [{ warbandId: before.id, name: before.name, result: draft.result }];
    const opp = session?.opponentWarbandId ? myWarbands.find((w) => w.id === session.opponentWarbandId) : undefined;
    if (opp) {
      const { data: oppLink } = await supabase.from('warbands').select('campaign_id').eq('id', opp.id).maybeSingle();
      if (oppLink?.campaign_id === campaignId) participants.push({ warbandId: opp.id, name: opp.name, result: flip(draft.result) });
    }
    const { error: logErr } = await supabase.rpc('report_campaign_battle', {
      p_campaign: campaignId,
      p_played_on: record.date,
      p_scenario: record.scenario.slice(0, 64),
      p_participants: participants,
      p_notes: opponent && !opp ? `vs ${opponent}` : '',
    });
    if (logErr) return `Saved to your history, but not to the campaign log: ${logErr.message}`;
  }
  return null;
}

export async function loadBattles(warbandId: string): Promise<{ rows: BattleRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('battles')
    .select('id, played_on, result, scenario, opponent, rating_after, campaign_id, data')
    .eq('warband_id', warbandId)
    .order('played_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []).map((r) => ({
      id: r.id as string,
      playedOn: r.played_on as string,
      result: r.result as BattleResult,
      scenario: r.scenario as string,
      opponent: r.opponent as string,
      ratingAfter: r.rating_after as number,
      campaignId: (r.campaign_id as string | null) ?? null,
      record: r.data as BattleRecord,
    })),
    error: null,
  };
}

export async function deleteBattle(id: string): Promise<string | null> {
  const { error } = await supabase.from('battles').delete().eq('id', id);
  return error ? error.message : null;
}
