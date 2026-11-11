import { createContext, useCallback, useContext, useMemo, ReactNode, createElement } from 'react';
import { RemoteCollection, useRemoteCollection } from './remoteCollection';
import { CampaignAgenda } from '../lib/soloAgenda';

// Solo campaigns — a sequence of linked games for one warband against a recurring
// app-built nemesis, with a hidden overarching agenda (spec §6). Supabase-backed
// like the warband store.

export type SoloResult = 'win' | 'loss' | 'draw';

export type SoloChapterEntry = {
  chapter: number;
  act: number;
  scenario: string;
  opponentName: string;
  result: SoloResult;
  notes: string;
  date: string; // ISO
};

export type SoloCampaign = {
  id: string;
  name: string;
  warbandId: string; // the player's warband on this campaign
  nemesisType: string; // enemy warband definition id (recurring faction)
  nemesisName: string; // display name of that faction
  agenda: CampaignAgenda; // overarching hidden enemy plan
  agendaRevealed: boolean;
  act: number; // current act, 1..ACTS
  chapter: number; // the next chapter number to play (1-based)
  chaptersPerAct: number;
  log: SoloChapterEntry[];
  status: 'active' | 'concluded';
  createdAt: string;
};

const LEGACY_KEY = 'mordhive.soloCampaigns';

type SoloCampaignsContextValue = {
  campaigns: SoloCampaign[];
  ready: boolean;
  getCampaign: (id: string | undefined) => SoloCampaign | undefined;
  createCampaign: (c: SoloCampaign) => void;
  saveCampaign: (c: SoloCampaign) => void;
  deleteCampaign: (id: string) => void;
  sync: Pick<RemoteCollection<SoloCampaign>, 'error' | 'clearError' | 'pendingImport' | 'importLocal' | 'dismissImport'>;
};

const SoloCampaignsContext = createContext<SoloCampaignsContextValue | null>(null);

// Backed by Supabase (`mordhive.solo_campaigns`, owner-only: the hidden agenda
// lives in `data`). Same synchronous shape as the old localStorage store.
const toRow = (c: SoloCampaign) => ({ id: c.id, warband_id: c.warbandId, data: c });
const fromRow = (row: { data: unknown }) => row.data as SoloCampaign;

export function SoloCampaignsProvider({ children }: { children: ReactNode }) {
  const col = useRemoteCollection<SoloCampaign>({ table: 'solo_campaigns', legacyKey: LEGACY_KEY, toRow, fromRow });
  const { items, ready, create, save, remove, error, clearError, pendingImport, importLocal, dismissImport } = col;

  const getCampaign = useCallback((id: string | undefined) => items.find((c) => c.id === id), [items]);

  const value = useMemo<SoloCampaignsContextValue>(
    () => ({
      campaigns: items,
      ready,
      getCampaign,
      createCampaign: create,
      saveCampaign: save,
      deleteCampaign: remove,
      sync: { error, clearError, pendingImport, importLocal, dismissImport },
    }),
    [items, ready, getCampaign, create, save, remove, error, clearError, pendingImport, importLocal, dismissImport],
  );

  // createElement rather than JSX so this store stays a .ts file like battle.ts.
  return createElement(SoloCampaignsContext.Provider, { value }, children);
}

export function useSoloCampaigns(): SoloCampaignsContextValue {
  const ctx = useContext(SoloCampaignsContext);
  if (!ctx) throw new Error('useSoloCampaigns must be used within a SoloCampaignsProvider');
  return ctx;
}
