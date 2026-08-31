import { Link } from 'react-router-dom';
import { useWarbands } from '../store/warbands';
import { getWarbandTypeName } from '../data/warbandRegistry';
import { computeWarbandRating, countModels } from '../lib/rating';
import { strings } from '../strings';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';

const { terms } = strings;

/** Your warbands, with a create button. The Warbands tab's home. */
export default function WarbandsListScreen() {
  const { warbands } = useWarbands();

  return (
    <div className="space-y-6">
      <BannerHeader as="h1" trailing={<PageChip>{warbands.length}</PageChip>}>
        {terms.rosterPlural}
      </BannerHeader>

      {warbands.length === 0 ? (
        <Plate className="p-6 text-center space-y-4">
          <p className="font-body text-ink text-body-min">
            No {terms.rosterPlural.toLowerCase()} yet. Muster one to start fighting over the hive.
          </p>
          <Link
            to="/warbands/new"
            className="inline-block bg-banner text-on-banner font-display uppercase tracking-[0.06em] px-4 py-2 min-h-[48px]"
          >
            + New {terms.roster.toLowerCase()}
          </Link>
        </Plate>
      ) : (
        <div className="space-y-3">
          {warbands.map((w) => (
            <Link key={w.id} to={`/warbands/${w.id}`} className="block">
              <Plate className="p-4 hover:bg-page transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display uppercase tracking-[0.04em] text-ink text-lg truncate">
                      {w.name}
                    </h2>
                    <p className="font-body text-ink-faded text-sm truncate">
                      {getWarbandTypeName(w.warbandType)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <PageChip>Rating {computeWarbandRating(w)}</PageChip>
                    <span className="font-body text-ink-faded text-xs tabular-nums">
                      {countModels(w)} models · {w.gold} {terms.currencyAbbr}
                    </span>
                  </div>
                </div>
              </Plate>
            </Link>
          ))}
          <Link
            to="/warbands/new"
            className="inline-block bg-banner text-on-banner font-display uppercase tracking-[0.06em] px-4 py-2 min-h-[48px]"
          >
            + New {terms.roster.toLowerCase()}
          </Link>
        </div>
      )}
    </div>
  );
}
