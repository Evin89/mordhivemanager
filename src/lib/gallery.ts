import { supabase } from './supabase';
import { Warband } from '../types';

// The public gallery: warbands their owners marked public. Readable signed out
// (RLS: "anyone reads public warbands"). Lists only read the lifted columns,
// never the roster jsonb, so a page of 24 cards stays a few kilobytes.

export type GalleryCard = {
  id: string;
  name: string;
  warbandType: string;
  rating: number;
  ownerName: string;
  updatedAt: string;
};

export const GALLERY_PAGE = 24;

async function ownerNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids)];
  if (!unique.length) return map;
  const { data } = await supabase.from('profiles').select('id, display_name').in('id', unique);
  (data ?? []).forEach((p) => map.set(p.id as string, (p.display_name as string) || 'Unnamed player'));
  return map;
}

/** One page, newest first. `before` is the previous page's last updatedAt (keyset paging). */
export async function loadGalleryPage(
  warbandType: string,
  before?: string,
): Promise<{ cards: GalleryCard[]; error: string | null }> {
  let q = supabase
    .from('warbands')
    .select('id, name, warband_type, rating, owner_id, updated_at')
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
    .limit(GALLERY_PAGE);
  if (warbandType) q = q.eq('warband_type', warbandType);
  if (before) q = q.lt('updated_at', before);
  const { data, error } = await q;
  if (error) return { cards: [], error: error.message };
  const names = await ownerNames((data ?? []).map((r) => r.owner_id as string));
  return {
    cards: (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      warbandType: r.warband_type as string,
      rating: r.rating as number,
      ownerName: names.get(r.owner_id as string) ?? 'Unnamed player',
      updatedAt: r.updated_at as string,
    })),
    error: null,
  };
}

/** A single warband to read — public ones for anyone; RLS also lets owners and campaign-mates through. */
export async function loadReadableWarband(id: string): Promise<{ warband: Warband | null; owner: string; error: string | null }> {
  const { data, error } = await supabase.from('warbands').select('data, owner_id').eq('id', id).maybeSingle();
  if (error) return { warband: null, owner: '', error: error.message };
  if (!data) return { warband: null, owner: '', error: null };
  const names = await ownerNames([data.owner_id as string]);
  return { warband: data.data as Warband, owner: names.get(data.owner_id as string) ?? '', error: null };
}
