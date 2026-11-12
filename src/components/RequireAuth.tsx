import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useWarbands } from '../store/warbands';
import { useSoloCampaigns } from '../store/soloCampaign';
import Plate from './Plate';

/**
 * Gate for everything that reads or writes the player's own data. Signed out →
 * the sign-in screen, remembering where they were headed. Signed in → waits for
 * the first fetch so a roster deep link doesn't flash "not found" while loading.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { ready: warbandsReady } = useWarbands();
  const { ready: soloReady } = useSoloCampaigns();
  const location = useLocation();

  if (loading || (user && (!warbandsReady || !soloReady))) {
    return (
      <Plate className="p-4">
        <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-sm" role="status">
          Opening the archive…
        </p>
      </Plate>
    );
  }
  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
