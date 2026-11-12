import { supabase } from './supabase';
import { BattleResult } from '../types';

// Campaigns with your group (mh_0002). Unlike warbands these aren't held in a
// store: every screen reads fresh, because other players change them.
// Creating, joining, leaving and new join codes go through RPCs; RLS keeps
// everything here visible to members only.

export type CampaignRole = 'leader' | 'player';

export type CampaignSummary = {
  id: string;
  name: string;
  role: CampaignRole;
  memberCount: number;
};

export type CampaignDetail = {
  id: string;
  name: string;
  joinCode: string;
  createdAt: string;
  myRole: CampaignRole;
};

export type CampaignMember = {
  userId: string;
  displayName: string;
  role: CampaignRole;
  joinedAt: string;
};

export type CampaignWarband = {
  id: string;
  name: string;
  warbandType: string;
  rating: number;
  ownerId: string;
};

export type BattleParticipant = { warbandId: string; name: string; result: BattleResult };

export type CampaignBattle = {
  id: string;
  playedOn: string;
  scenario: string;
  participants: BattleParticipant[];
  notes: string;
  reportedBy: string | null;
};

/** Turn a Postgres/PostgREST error into something a player can act on. */
export function campaignError(err: { message?: string; code?: string } | null): string | null {
  if (!err) return null;
  if (err.code === 'P0002') return 'No campaign has that join code. Check it with whoever sent it.';
  if (err.code === 'PGRST106') return 'The Mord Hive database is not switched on yet.';
  if (/fetch|network/i.test(err.message ?? '')) return 'No connection. Try again when you are back online.';
  return err.message ?? 'Something went wrong.';
}

export async function listMyCampaigns(userId: string): Promise<{ data: CampaignSummary[]; error: string | null }> {
  const { data: mine, error } = await supabase
    .from('campaign_members')
    .select('campaign_id, role, campaigns(name)')
    .eq('user_id', userId);
  if (error) return { data: [], error: campaignError(error) };
  const ids = (mine ?? []).map((m) => m.campaign_id as string);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: all } = await supabase.from('campaign_members').select('campaign_id').in('campaign_id', ids);
    (all ?? []).forEach((r) => counts.set(r.campaign_id as string, (counts.get(r.campaign_id as string) ?? 0) + 1));
  }
  const data = (mine ?? [])
    .map((m) => {
      const camp = m.campaigns as unknown as { name: string } | null;
      return {
        id: m.campaign_id as string,
        name: camp?.name ?? 'Campaign',
        role: m.role as CampaignRole,
        memberCount: counts.get(m.campaign_id as string) ?? 1,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return { data, error: null };
}

export async function createCampaign(name: string) {
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name });
  return { id: (data as string | null) ?? null, error: campaignError(error) };
}

export async function joinCampaign(code: string) {
  const { data, error } = await supabase.rpc('join_campaign', { p_code: code });
  return { id: (data as string | null) ?? null, error: campaignError(error) };
}

export async function leaveCampaign(id: string) {
  const { error } = await supabase.rpc('leave_campaign', { p_campaign: id });
  return campaignError(error);
}

export async function regenerateJoinCode(id: string) {
  const { data, error } = await supabase.rpc('regenerate_join_code', { p_campaign: id });
  return { code: (data as string | null) ?? null, error: campaignError(error) };
}

export async function renameCampaign(id: string, name: string) {
  const { error } = await supabase.from('campaigns').update({ name: name.trim() }).eq('id', id);
  return campaignError(error);
}

export async function removeMember(campaignId: string, userId: string) {
  const { error } = await supabase
    .from('campaign_members')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('user_id', userId);
  return campaignError(error);
}

/** Everything the campaign screen shows, in one go. */
export async function loadCampaign(id: string, userId: string) {
  const [campRes, memRes, wbRes, batRes] = await Promise.all([
    supabase.from('campaigns').select('id, name, join_code, created_at').eq('id', id).maybeSingle(),
    supabase.from('campaign_members').select('user_id, role, joined_at').eq('campaign_id', id),
    supabase.from('warbands').select('id, name, warband_type, rating, owner_id').eq('campaign_id', id),
    supabase
      .from('campaign_battles')
      .select('id, played_on, scenario, participants, notes, reported_by')
      .eq('campaign_id', id)
      .order('played_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  const error = campaignError(campRes.error ?? memRes.error ?? wbRes.error ?? batRes.error);
  if (error || !campRes.data) return { campaign: null, members: [], warbands: [], battles: [], error };

  const memberRows = memRes.data ?? [];
  const names = new Map<string, string>();
  if (memberRows.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', memberRows.map((m) => m.user_id as string));
    (profiles ?? []).forEach((p) => names.set(p.id as string, (p.display_name as string) || 'Unnamed player'));
  }

  const myRole = (memberRows.find((m) => m.user_id === userId)?.role ?? 'player') as CampaignRole;
  const campaign: CampaignDetail = {
    id: campRes.data.id as string,
    name: campRes.data.name as string,
    joinCode: campRes.data.join_code as string,
    createdAt: campRes.data.created_at as string,
    myRole,
  };
  const members: CampaignMember[] = memberRows
    .map((m) => ({
      userId: m.user_id as string,
      displayName: names.get(m.user_id as string) ?? 'Unnamed player',
      role: m.role as CampaignRole,
      joinedAt: m.joined_at as string,
    }))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  const warbands: CampaignWarband[] = (wbRes.data ?? []).map((w) => ({
    id: w.id as string,
    name: w.name as string,
    warbandType: w.warband_type as string,
    rating: w.rating as number,
    ownerId: w.owner_id as string,
  }));
  const battles: CampaignBattle[] = (batRes.data ?? []).map((b) => ({
    id: b.id as string,
    playedOn: b.played_on as string,
    scenario: b.scenario as string,
    participants: (b.participants as BattleParticipant[]) ?? [],
    notes: b.notes as string,
    reportedBy: (b.reported_by as string | null) ?? null,
  }));
  return { campaign, members, warbands, battles, error: null };
}

export async function linkWarband(warbandId: string, campaignId: string | null) {
  const { error } = await supabase.from('warbands').update({ campaign_id: campaignId }).eq('id', warbandId);
  return campaignError(error);
}

export async function logBattle(
  campaignId: string,
  entry: { playedOn: string; scenario: string; participants: BattleParticipant[]; notes: string },
) {
  const { error } = await supabase.from('campaign_battles').insert({
    campaign_id: campaignId,
    played_on: entry.playedOn,
    scenario: entry.scenario,
    participants: entry.participants,
    notes: entry.notes,
  });
  return campaignError(error);
}

export async function deleteBattle(id: string) {
  const { error } = await supabase.from('campaign_battles').delete().eq('id', id);
  return campaignError(error);
}

/** Wins / draws / losses per warband, from the battle log. */
export function tally(battles: CampaignBattle[]): Map<string, { w: number; d: number; l: number }> {
  const t = new Map<string, { w: number; d: number; l: number }>();
  for (const b of battles) {
    for (const p of b.participants) {
      const row = t.get(p.warbandId) ?? { w: 0, d: 0, l: 0 };
      if (p.result === 'win') row.w++;
      else if (p.result === 'draw') row.d++;
      else row.l++;
      t.set(p.warbandId, row);
    }
  }
  return t;
}
