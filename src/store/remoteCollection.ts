import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

// One signed-in user's rows from a `mordhive.*` table, held in memory and written
// through to Supabase. The screens were built against a synchronous local store
// (create/save/delete return nothing and the change shows at once), so this keeps
// that contract: state updates immediately, the network write follows.
//
// Saves are debounced per row: the detail screens auto-save on every keystroke,
// and one upsert per pause is plenty. Pending saves are flushed when the tab is
// hidden, so a phone locked mid-edit still lands the change.
//
// Also handles the one-time move of data a player built before accounts existed
// (localStorage, the pre-Supabase store) into their account.

const SAVE_DELAY_MS = 600;

export type RemoteCollectionOptions<T extends { id: string }> = {
  table: 'warbands' | 'solo_campaigns';
  /** The old localStorage key, offered for import once after sign-in. */
  legacyKey: string;
  toRow: (item: T) => Record<string, unknown>;
  fromRow: (row: { data: unknown }) => T;
};

export type RemoteCollection<T extends { id: string }> = {
  items: T[];
  /** False until the first fetch for the signed-in user has finished. */
  ready: boolean;
  /** Last write or read failure, in words a player can act on. */
  error: string | null;
  clearError: () => void;
  create: (item: T) => void;
  save: (item: T) => void;
  remove: (id: string) => void;
  /** Rows from the old local store that aren't in the account yet. */
  pendingImport: T[];
  importLocal: () => Promise<void>;
  dismissImport: () => void;
};

function readLegacy<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Keep the old data under a new key instead of deleting it — cheap insurance. */
function retireLegacy(key: string): void {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      localStorage.setItem(`${key}.imported`, raw);
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

function describe(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return 'Something went wrong talking to the server.';
  if (err.code === 'PGRST106') {
    return 'The Mord Hive database is not switched on yet (schema not exposed). Your change is kept on this screen only.';
  }
  if (/fetch|network/i.test(err.message ?? '')) {
    return 'No connection. Your last change was not saved — try again when you are back online.';
  }
  return `Not saved: ${err.message ?? 'unknown error'}`;
}

export function useRemoteCollection<T extends { id: string }>(opts: RemoteCollectionOptions<T>): RemoteCollection<T> {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { table, legacyKey } = opts;

  // Keep the mapping functions in a ref: callers pass fresh closures each render.
  const mapRef = useRef(opts);
  mapRef.current = opts;

  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<T[]>([]);

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queued = useRef(new Map<string, T>());

  // Load on sign-in, clear on sign-out.
  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setReady(false);
    setPendingImport([]);
    if (!userId) return;

    (async () => {
      const { data, error: err } = await supabase
        .from(table)
        .select('data')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (err) {
        setError(describe(err));
        setReady(true);
        return;
      }
      const loaded = (data ?? []).map((row) => mapRef.current.fromRow(row as { data: unknown }));
      setItems(loaded);
      const have = new Set(loaded.map((i) => i.id));
      setPendingImport(readLegacy<T>(legacyKey).filter((i) => i && typeof i.id === 'string' && !have.has(i.id)));
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, table, legacyKey]);

  const write = useCallback(
    async (item: T) => {
      const { error: err } = await supabase.from(table).upsert(mapRef.current.toRow(item));
      if (err) setError(describe(err));
    },
    [table],
  );

  const flush = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    const pending = [...queued.current.values()];
    queued.current.clear();
    pending.forEach((item) => void write(item));
  }, [write]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const create = useCallback(
    (item: T) => {
      setItems((prev) => [...prev, item]);
      void write(item);
    },
    [write],
  );

  const save = useCallback(
    (item: T) => {
      setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
      queued.current.set(item.id, item);
      const existing = timers.current.get(item.id);
      if (existing) clearTimeout(existing);
      timers.current.set(
        item.id,
        setTimeout(() => {
          timers.current.delete(item.id);
          const latest = queued.current.get(item.id);
          queued.current.delete(item.id);
          if (latest) void write(latest);
        }, SAVE_DELAY_MS),
      );
    },
    [write],
  );

  const remove = useCallback(
    (id: string) => {
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      timers.current.delete(id);
      queued.current.delete(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      void supabase
        .from(table)
        .delete()
        .eq('id', id)
        .then(({ error: err }) => {
          if (err) setError(describe(err));
        });
    },
    [table],
  );

  const importLocal = useCallback(async () => {
    if (pendingImport.length === 0) return;
    const rows = pendingImport.map((i) => mapRef.current.toRow(i));
    const { error: err } = await supabase.from(table).upsert(rows);
    if (err) {
      setError(describe(err));
      return;
    }
    setItems((prev) => [...prev, ...pendingImport]);
    setPendingImport([]);
    retireLegacy(legacyKey);
  }, [pendingImport, table, legacyKey]);

  const dismissImport = useCallback(() => {
    setPendingImport([]);
    retireLegacy(legacyKey);
  }, [legacyKey]);

  const clearError = useCallback(() => setError(null), []);

  return { items, ready, error, clearError, create, save, remove, pendingImport, importLocal, dismissImport };
}
