import { useEffect, useState } from 'react';
import { BattleRow, loadBattles } from './battles';

export function useDossierBattles(warbandId: string | undefined) {
  const [history, setHistory] = useState<{
    warbandId?: string;
    rows: BattleRow[];
    error: string | null;
    loading: boolean;
  }>({ rows: [], error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    if (!warbandId) return;
    setHistory({ warbandId, rows: [], error: null, loading: true });
    loadBattles(warbandId).then(result => {
      if (!cancelled) setHistory({ warbandId, ...result, loading: false });
    }).catch(() => {
      if (!cancelled) setHistory({ warbandId, rows: [], error: 'Battle history unavailable.', loading: false });
    });
    return () => { cancelled = true; };
  }, [warbandId]);

  return history.warbandId === warbandId
    ? history
    : { rows: [], error: null, loading: true };
}
