import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Datasheet from '../components/Datasheet';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { getWarbandTypeName } from '../data/warbandRegistry';
import { computeWarbandRating, countModels, isInWarband } from '../lib/rating';
import { hasActiveBattle } from '../store/battle';

const { terms } = strings;

/** A warband's roster: treasury and rating, then every Hero and Henchmen group
 * as a Codex datasheet, with recruit controls. Mirrors MM's RosterScreen. */
export default function RosterScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const navigate = useNavigate();
  const warband = useWarbandLookup(warbandId);
  const { deleteWarband } = useWarbands();

  if (!warband) return <Navigate to="/warbands" replace />;

  const activeHeroes = warband.heroes.filter((h) => isInWarband(h.status));
  const equipList = (items: { name: string }[]) => items.map((i) => i.name).join(', ');

  function handleDelete() {
    if (!warband) return;
    if (window.confirm(`Delete "${warband.name}"? This cannot be undone.`)) {
      deleteWarband(warband.id);
      navigate('/warbands', { replace: true });
    }
  }

  return (
    <div>
      <BackHeader title={warband.name} to="/warbands" />

      <div className="py-6 space-y-6">
        {/* Treasury / rating summary */}
        <Plate className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display uppercase tracking-[0.05em] text-ink text-lg">{warband.name}</p>
              <p className="font-body text-ink-faded text-sm">{getWarbandTypeName(warband.warbandType)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PageChip>Rating {computeWarbandRating(warband)}</PageChip>
              <PageChip>{warband.gold} {terms.currencyAbbr}</PageChip>
              <PageChip>{countModels(warband)} models</PageChip>
            </div>
          </div>
        </Plate>

        {/* Recruit + shop controls */}
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/warbands/${warband.id}/add-hero`}
            className="bg-banner text-on-banner font-display uppercase tracking-[0.06em] px-4 py-2 min-h-[48px] inline-flex items-center"
          >
            + {terms.hero}
          </Link>
          <Link
            to={`/warbands/${warband.id}/add-henchmen`}
            className="bg-banner text-on-banner font-display uppercase tracking-[0.06em] px-4 py-2 min-h-[48px] inline-flex items-center"
          >
            + {terms.henchmanPlural}
          </Link>
          <Link
            to={`/warbands/${warband.id}/trading`}
            className="bg-plate text-ink border-2 border-steel font-display uppercase tracking-[0.06em] px-4 py-2 min-h-[48px] inline-flex items-center"
          >
            Trading Post
          </Link>
          <Link
            to={`/warbands/${warband.id}/${hasActiveBattle(warband.id) ? 'battle' : 'pre-battle'}`}
            className="bg-banner text-on-banner font-display uppercase tracking-[0.06em] px-4 py-2 min-h-[48px] inline-flex items-center"
          >
            {hasActiveBattle(warband.id) ? 'Resume battle' : 'Battle'}
          </Link>
        </div>

        {/* Heroes */}
        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{activeHeroes.length}</PageChip>}>
            {terms.heroPlural}
          </BannerHeader>
          {activeHeroes.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">No heroes yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeHeroes.map((h) => (
                <Link key={h.id} to={`/warbands/${warband.id}/hero/${h.id}`} className="block hover:opacity-90">
                  <Datasheet
                    name={h.name}
                    subtitle={`${h.unitType}${h.isLeader ? ' · Leader' : ''} · ${h.xp} XP`}
                    stats={h.stats}
                    maximums={h.statMaximums}
                    wargear={equipList(h.equipment)}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Henchmen */}
        <section className="space-y-3">
          <BannerHeader
            trailing={
              <PageChip className="border-on-banner/40">{warband.henchmenGroups.length}</PageChip>
            }
          >
            {terms.henchmanPlural}
          </BannerHeader>
          {warband.henchmenGroups.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">No henchmen yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {warband.henchmenGroups.map((g) => (
                <Link key={g.id} to={`/warbands/${warband.id}/henchmen/${g.id}`} className="block hover:opacity-90">
                  <Datasheet
                    name={g.groupName}
                    subtitle={`${g.count}x ${g.unitType} · ${g.xp} XP each`}
                    stats={g.stats}
                    wargear={equipList(g.equipment)}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="pt-4">
          <Button variant="danger" fullWidth={false} onClick={handleDelete}>
            Delete {terms.roster.toLowerCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
