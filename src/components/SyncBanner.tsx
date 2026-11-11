import { useState } from 'react';
import { useAuth } from '../store/auth';
import { useWarbands } from '../store/warbands';
import { useSoloCampaigns } from '../store/soloCampaign';
import { Button } from './ui';

/**
 * Two things the backend needs to tell the player about, shown above every
 * screen: a save that didn't land, and (once, after first sign-in) warbands
 * built on this device before accounts existed, offered for import.
 */
export default function SyncBanner() {
  const { user } = useAuth();
  const w = useWarbands().sync;
  const s = useSoloCampaigns().sync;
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const error = w.error ?? s.error;
  const nWarbands = w.pendingImport.length;
  const nSolo = s.pendingImport.length;

  return (
    <>
      {error && (
        <div className="border-2 border-banner bg-plate px-4 py-3 mb-4" role="alert">
          <p className="font-body text-ink text-body-min">{error}</p>
          <div className="mt-2 max-w-[12rem]">
            <Button
              variant="secondary"
              size="dense"
              onClick={() => {
                w.clearError();
                s.clearError();
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {(nWarbands > 0 || nSolo > 0) && (
        <div className="plated-frame bg-plate px-4 py-3 mb-4">
          <p className="font-display uppercase tracking-[0.06em] text-ink text-sm mb-1">Found on this device</p>
          <p className="font-body text-ink text-body-min">
            {nWarbands > 0 && `${nWarbands} warband${nWarbands === 1 ? '' : 's'}`}
            {nWarbands > 0 && nSolo > 0 && ' and '}
            {nSolo > 0 && `${nSolo} solo campaign${nSolo === 1 ? '' : 's'}`} from before you had an account. Add
            them to your account so they're on every device?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="w-full sm:w-auto">
              <Button
                fullWidth={false}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  // Warbands first: solo campaigns point at them.
                  await w.importLocal();
                  await s.importLocal();
                  setBusy(false);
                }}
              >
                {busy ? 'Adding…' : 'Add to my account'}
              </Button>
            </div>
            <div className="w-full sm:w-auto">
              <Button
                variant="secondary"
                fullWidth={false}
                disabled={busy}
                onClick={() => {
                  w.dismissImport();
                  s.dismissImport();
                }}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
