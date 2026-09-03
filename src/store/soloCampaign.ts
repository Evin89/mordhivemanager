import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode, createElement } from 'react';
import { CampaignAgenda } from '../lib/soloAgenda';

// Solo campaigns — a sequence of linked games for one warband against a recurring
// app-built nemesis, with a hidden overarching agenda (spec §6). localStorage-
// backed like the warband store, same swap-in-Supabase-later shape.

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

const STORAGE_KEY = 'mordhive.soloCampaigns';

function load(): SoloCampaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SoloCampaign[]) : [];
  } catch {
    return [];
  }
}

function persist(list: SoloCampaign[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* best-effort */
  }
}

type SoloCampaignsContextValue = {
  campaigns: SoloCampaign[];
  getCampaign: (id: string | undefined) => SoloCampaign | undefined;
  createCampaign: (c: SoloCampaign) => void;
  saveCampaign: (c: SoloCampaign) => void;
  deleteCampaign: (id: string) => void;
};

const SoloCampaignsContext = createContext<SoloCampaignsContextValue | null>(null);

export function SoloCampaignsProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<SoloCampaign[]>(load);

  useEffect(() => {
    persist(campaigns);
  }, [campaigns]);

  const getCampaign = useCallback((id: string | undefined) => campaigns.find((c) => c.id === id), [campaigns]);
  const createCampaign = useCallback((c: SoloCampaign) => setCampaigns((prev) => [...prev, c]), []);
  const saveCampaign = useCallback(
    (c: SoloCampaign) => setCampaigns((prev) => prev.map((x) => (x.id === c.id ? c : x))),
    [],
  );
  const deleteCampaign = useCallback((id: string) => setCampaigns((prev) => prev.filter((c) => c.id !== id)), []);

  const value = useMemo(
    () => ({ campaigns, getCampaign, createCampaign, saveCampaign, deleteCampaign }),
    [campaigns, getCampaign, createCampaign, saveCampaign, deleteCampaign],
  );

  // createElement rather than JSX so this store stays a .ts file like battle.ts.
  return createElement(SoloCampaignsContext.Provider, { value }, children);
}

export function useSoloCampaigns(): SoloCampaignsContextValue {
  const ctx = useContext(SoloCampaignsContext);
  if (!ctx) throw new Error('useSoloCampaigns must be used within a SoloCampaignsProvider');
  return ctx;
}
