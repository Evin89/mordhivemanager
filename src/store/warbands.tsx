import { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import { Warband } from '../types';
import { computeWarbandRating } from '../lib/rating';
import { RemoteCollection, useRemoteCollection } from './remoteCollection';

// Warband store, backed by Supabase (`mordhive.warbands`). The screens see the
// same synchronous call shape they had over localStorage — a lookup plus
// create/save/delete — so none of them changed when the backend arrived.
// The roster lives in `data`; name, type and rating are lifted into columns so
// lists and a future gallery never have to open the jsonb.

const LEGACY_KEY = 'mordhive.warbands';

type WarbandsContextValue = {
  warbands: Warband[];
  ready: boolean;
  getWarband: (id: string | undefined) => Warband | undefined;
  createWarband: (warband: Warband) => void;
  saveWarband: (warband: Warband) => void;
  deleteWarband: (id: string) => void;
  sync: Pick<RemoteCollection<Warband>, 'error' | 'clearError' | 'pendingImport' | 'importLocal' | 'dismissImport'>;
};

const WarbandsContext = createContext<WarbandsContextValue | null>(null);

function toRow(w: Warband) {
  return {
    id: w.id,
    name: (w.name || 'Unnamed warband').slice(0, 120),
    warband_type: w.warbandType,
    rating: computeWarbandRating(w),
    visibility: w.visibility ?? 'private',
    data: w,
  };
}

function fromRow(row: { data: unknown }): Warband {
  return row.data as Warband;
}

export function WarbandsProvider({ children }: { children: ReactNode }) {
  const col = useRemoteCollection<Warband>({ table: 'warbands', legacyKey: LEGACY_KEY, toRow, fromRow });
  const { items, ready, create, save, remove, error, clearError, pendingImport, importLocal, dismissImport } = col;

  const getWarband = useCallback((id: string | undefined) => items.find((w) => w.id === id), [items]);

  const value = useMemo<WarbandsContextValue>(
    () => ({
      warbands: items,
      ready,
      getWarband,
      createWarband: create,
      saveWarband: save,
      deleteWarband: remove,
      sync: { error, clearError, pendingImport, importLocal, dismissImport },
    }),
    [items, ready, getWarband, create, save, remove, error, clearError, pendingImport, importLocal, dismissImport],
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
