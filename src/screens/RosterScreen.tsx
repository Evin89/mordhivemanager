import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import ChevronRail from '../components/ChevronRail';
import BattleHistory from '../components/BattleHistory';
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
  const { deleteWarband, saveWarband } = useWarbands();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;

  if (!warband) return <Navigate to="/warbands" replace />;

  const activeHeroes = warband.heroes.filter((h) => isInWarband(h.status));
  const activeHired = warband.hiredSwords.filter((h) => isInWarband(h.status));
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
        {notice && (
          <p className="font-body text-ink border-l-4 border-banner pl-3" role="alert">
            {notice}
          </p>
        )}
        <div><div className="roster-band"><h1>{warband.name}</h1><p className="type">{getWarbandTypeName(warband.warbandType)}, {warband.visibility === 'public' ? 'public' : 'private'}</p><div className="metrics"><div><strong>{computeWarbandRating(warband)}</strong><span>Rating</span></div><div><strong>{warband.gold} tn</strong><span>Thrones</span></div><div><strong>{warband.wyrdstoneShards}</strong><span>Diamantine</span></div><div><strong>{countModels(warband)}</strong><span>Models</span></div></div><div className="grid grid-cols-2 gap-3 mt-5"><Link className="btn btn-p" to={`/warbands/${warband.id}/${hasActiveBattle(warband.id) ? 'battle' : 'pre-battle'}`}>{hasActiveBattle(warband.id) ? 'Resume battle' : 'Battle'}</Link><Link className="btn btn-s" to={`/warbands/${warband.id}/trading`}>Trading Post</Link></div></div><ChevronRail /></div>

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
                    hero leader={h.isLeader} xp={h.xp}
                    name={h.name}
                    subtitle={h.unitType}
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

        {/* Hired Guns */}
        {activeHired.length > 0 && (
          <section className="space-y-3">
            <BannerHeader trailing={<PageChip className="border-on-banner/40">{activeHired.length}</PageChip>}>
              Hired Guns
            </BannerHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeHired.map((h) => (
                <Link key={h.id} to={`/warbands/${warband.id}/hired/${h.id}`} className="block hover:opacity-90">
                  <Datasheet
                    name={h.name}
                    subtitle={`${h.type} · ${h.xp} XP · upkeep ${h.upkeep} ${terms.currencyAbbr}`}
                    stats={h.stats}
                    wargear={equipList(h.equipment)}
                  />
                </Link>
              ))}
            </div>
            <p className="font-body text-ink-faded text-xs px-1">
              Hired Guns don't count toward your warband's size and never shop; you pay their upkeep after every battle.
            </p>
          </section>
        )}

        <div className="roster-recruit"><Link
            to={`/warbands/${warband.id}/add-hero`}
            className="btn btn-s"
          >
            + {terms.hero}
          </Link><Link
            to={`/warbands/${warband.id}/add-henchmen`}
            className="btn btn-s"
          >
            + {terms.henchmanPlural}
          </Link><Link
            to={`/warbands/${warband.id}/add-hired-gun`}
            className="btn btn-s"
          >
            + Hired Gun
          </Link></div>
        {/* Sharing + print */}
        <Plate className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display uppercase tracking-[0.06em] text-ink text-sm">
                {warband.visibility === 'public' ? 'Public — in the gallery' : 'Private'}
              </p>
              <p className="font-body text-ink-faded text-sm">
                {warband.visibility === 'public'
                  ? 'Anyone with the link can read this roster.'
                  : 'Only you, and players in a campaign it is linked to.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="dense"
                variant="secondary"
                fullWidth={false}
                onClick={() =>
                  saveWarband({ ...warband, visibility: warband.visibility === 'public' ? 'private' : 'public' })
                }
              >
                {warband.visibility === 'public' ? 'Make private' : 'Make public'}
              </Button>
              <Link
                to={`/warbands/${warband.id}/print`}
                className="btn btn-s"
              >
                Print sheet
              </Link>
            </div>
          </div>
        </Plate>


        <BattleHistory warbandId={warband.id} />

        <div className="pt-4">
          <Button variant="danger" className="!bg-transparent !border-transparent !text-danger-link" fullWidth={false} onClick={handleDelete}>
            Delete {terms.roster.toLowerCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
