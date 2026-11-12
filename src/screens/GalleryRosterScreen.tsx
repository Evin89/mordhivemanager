import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadReadableWarband } from '../lib/gallery';
import { Warband } from '../types';
import BackHeader from '../components/BackHeader';
import RosterSheet from '../components/RosterSheet';
import Plate from '../components/Plate';

/** Someone else's warband, read-only — the same sheet as the printable roster. */
export default function GalleryRosterScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const [state, setState] = useState<{ warband: Warband | null; owner: string; error: string | null } | null>(null);

  useEffect(() => {
    if (!warbandId) return;
    let active = true;
    loadReadableWarband(warbandId).then((res) => active && setState(res));
    return () => {
      active = false;
    };
  }, [warbandId]);

  return (
    <div>
      <BackHeader title={state?.warband?.name ?? 'Warband'} to="/gallery" />
      <div className="py-6">
        {state === null ? (
          <p className="font-body text-ink-faded" role="status">Loading warband…</p>
        ) : !state.warband ? (
          <Plate className="p-4">
            <p className="font-body text-ink text-body-min">
              {state.error ?? 'This warband is private, or it no longer exists.'}
            </p>
          </Plate>
        ) : (
          <RosterSheet warband={state.warband} owner={state.owner || undefined} />
        )}
      </div>
    </div>
  );
}
