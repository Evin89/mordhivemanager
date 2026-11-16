import { useState } from 'react';
import { Warband } from '../types';
import { BattleRow } from '../lib/battles';
import { shareDossier } from '../lib/shareCard';

export default function ShareDossierButton({ warband, battles, loading }: {
  warband: Warband;
  battles: BattleRow[] | null;
  loading: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setMessage(null);
    try {
      await shareDossier(warband, battles);
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setMessage('Could not share the dossier. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-s min-h-[44px]" type="button" disabled={busy || loading} onClick={share}>
        {busy ? 'Preparing dossier…' : 'Share dossier'}
      </button>
      {message && <p className="font-body text-ink text-sm mt-2" role="status">{message}</p>}
    </div>
  );
}
