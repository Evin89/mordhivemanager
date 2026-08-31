import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Warband } from '../types';

// Local warband store. The Mordheim Manager build screens read/write through
// TanStack Query hooks over Supabase; the fresh-standalone Mord Hive shell keeps
// the same call shape (a lookup + a save mutation) but backs it with
// localStorage, so the screens vendor across almost unchanged and the app boots
// with no backend. Swapping in Supabase later is a matter of reimplementing this
// module, not the screens.

const STORAGE_KEY = 'mordhive.warbands';

function load(): Warband[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Warband[]) : [];
  } catch {
    return [];
  }
}

function persist(warbands: Warband[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(warbands));
  } catch {
    /* best-effort; state still lives in memory this session */
  }
}

type WarbandsContextValue = {
  warbands: Warband[];
  getWarband: (id: string | undefined) => Warband | undefined;
  createWarband: (warband: Warband) => void;
  saveWarband: (warband: Warband) => void;
  deleteWarband: (id: string) => void;
};

const WarbandsContext = createContext<WarbandsContextValue | null>(null);

export function WarbandsProvider({ children }: { children: ReactNode }) {
  const [warbands, setWarbands] = useState<Warband[]>(load);

  useEffect(() => {
    persist(warbands);
  }, [warbands]);

  const getWarband = useCallback(
    (id: string | undefined) => warbands.find((w) => w.id === id),
    [warbands],
  );

  const createWarband = useCallback((warband: Warband) => {
    setWarbands((prev) => [...prev, warband]);
  }, []);

  const saveWarband = useCallback((warband: Warband) => {
    setWarbands((prev) => prev.map((w) => (w.id === warband.id ? warband : w)));
  }, []);

  const deleteWarband = useCallback((id: string) => {
    setWarbands((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const value = useMemo(
    () => ({ warbands, getWarband, createWarband, saveWarband, deleteWarband }),
    [warbands, getWarband, createWarband, saveWarband, deleteWarband],
  );

  return <WarbandsContext.Provider value={value}>{children}</WarbandsContext.Provider>;
}

export function useWarbands(): WarbandsContextValue {
  const ctx = useContext(WarbandsContext);
  if (!ctx) throw new Error('useWarbands must be used within a WarbandsProvider');
  return ctx;
}

/** Mirrors MM's useWarbandLookup — a single warband by id. */
export function useWarbandLookup(id: string | undefined): Warband | undefined {
  const { getWarband } = useWarbands();
  return getWarband(id);
}
