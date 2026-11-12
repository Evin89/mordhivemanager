import { Navigate, useParams } from 'react-router-dom';
import { useWarbandLookup } from '../store/warbands';
import { useAuth } from '../store/auth';
import BackHeader from '../components/BackHeader';
import RosterSheet from '../components/RosterSheet';
import { Button } from '../components/ui';

/** The printable roster: the sheet plus a print button, which itself doesn't print. */
export default function PrintRosterScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const warband = useWarbandLookup(warbandId);
  const { displayName } = useAuth();
  if (!warband) return <Navigate to="/warbands" replace />;

  return (
    <div>
      <div className="no-print">
        <BackHeader title="Print sheet" to={`/warbands/${warband.id}`} />
        <div className="py-4 max-w-xs">
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>
      <RosterSheet warband={warband} owner={displayName || undefined} />
    </div>
  );
}
