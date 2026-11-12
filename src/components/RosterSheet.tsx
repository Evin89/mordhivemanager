import { HenchmenGroup, Hero, HiredSword, StatLine, Warband } from '../types';
import { getWarbandTypeName } from '../data/warbandRegistry';
import { computeWarbandRating, countModels, isInWarband } from '../lib/rating';
import { strings } from '../strings';

const { terms } = strings;
const STATS: (keyof StatLine)[] = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Ld'];

const names = (items: { name: string }[]) => items.map((i) => i.name).join(', ');

function StatRow({ stats }: { stats: StatLine }) {
  return (
    <table className="w-full table-fixed border-collapse text-center font-display tabular-nums text-sm">
      <thead>
        <tr>
          {STATS.map((k) => (
            <th key={k} className="border border-banner px-0 py-0.5 font-semibold text-xs">
              {k}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {STATS.map((k) => (
            <td key={k} className="border border-banner px-0 py-0.5">
              {stats[k]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function Line({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <p className="font-body text-sm leading-snug">
      <span className="font-display uppercase tracking-[0.06em] text-xs text-ink-faded mr-1.5">{label}</span>
      {value}
    </p>
  );
}

function ModelEntry({
  title,
  subtitle,
  stats,
  lines,
}: {
  title: string;
  subtitle: string;
  stats: StatLine;
  lines: { label: string; value: string | undefined }[];
}) {
  return (
    <article className="border-2 border-banner break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 bg-banner text-on-banner px-3 py-1">
        <h3 className="font-display uppercase tracking-[0.05em] text-base leading-tight">{title}</h3>
        <span className="font-display text-xs uppercase tracking-[0.06em] opacity-80">{subtitle}</span>
      </div>
      <div className="p-2 space-y-1.5">
        <StatRow stats={stats} />
        {lines.map((l) => (
          <Line key={l.label} {...l} />
        ))}
      </div>
    </article>
  );
}

function heroLines(h: Hero | HiredSword) {
  return [
    { label: terms.wargear, value: names(h.equipment) },
    { label: 'Skills', value: h.skills.join(', ') },
    { label: 'Powers', value: h.spells.join(', ') },
    { label: 'Injuries', value: h.injuries.map((i) => i.name).join(', ') },
    { label: 'Notes', value: h.notes },
  ];
}

function groupLines(g: HenchmenGroup) {
  return [
    { label: terms.wargear, value: names(g.equipment) },
    { label: 'Advances', value: g.advances.map((a) => a.detail).join(', ') },
    { label: 'Notes', value: g.notes },
  ];
}

/**
 * A whole warband on one sheet, ink on white (the `.print-sheet` palette), laid
 * out after the datasheet. Used for the printable roster and for reading a
 * public warband in the gallery — the same picture of a roster in both places.
 * Read-only by design: nothing here links into the editing screens.
 */
export default function RosterSheet({ warband, owner }: { warband: Warband; owner?: string }) {
  const heroes = warband.heroes.filter((h) => isInWarband(h.status));
  const hired = warband.hiredSwords.filter((h) => isInWarband(h.status));

  return (
    <div className="print-sheet bg-plate text-ink p-4 sm:p-6 space-y-4">
      <header className="border-b-2 border-banner pb-3">
        <h2 className="font-display uppercase tracking-[0.06em] text-2xl leading-tight">{warband.name}</h2>
        <p className="font-body text-ink-faded">
          {getWarbandTypeName(warband.warbandType)}
          {owner ? ` · ${owner}` : ''}
        </p>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-display tabular-nums text-sm">
          <div>
            <dt className="inline uppercase tracking-[0.06em] text-ink-faded mr-1">Rating</dt>
            <dd className="inline">{computeWarbandRating(warband)}</dd>
          </div>
          <div>
            <dt className="inline uppercase tracking-[0.06em] text-ink-faded mr-1">{terms.currency}</dt>
            <dd className="inline">{warband.gold} {terms.currencyAbbr}</dd>
          </div>
          <div>
            <dt className="inline uppercase tracking-[0.06em] text-ink-faded mr-1">{terms.salvageResource}</dt>
            <dd className="inline">{warband.wyrdstoneShards} {terms.salvageUnit}</dd>
          </div>
          <div>
            <dt className="inline uppercase tracking-[0.06em] text-ink-faded mr-1">Models</dt>
            <dd className="inline">{countModels(warband)}</dd>
          </div>
        </dl>
        {warband.treasury.length > 0 && (
          <div className="mt-2">
            <Line label="Stash" value={names(warband.treasury)} />
          </div>
        )}
      </header>

      {heroes.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display uppercase tracking-[0.08em] text-sm border-b border-banner">{terms.heroPlural}</h2>
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {heroes.map((h) => (
              <ModelEntry
                key={h.id}
                title={h.name}
                subtitle={`${h.unitType}${h.isLeader ? ` · ${terms.leader}` : ''} · ${h.xp} XP`}
                stats={h.stats}
                lines={heroLines(h)}
              />
            ))}
          </div>
        </section>
      )}

      {warband.henchmenGroups.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display uppercase tracking-[0.08em] text-sm border-b border-banner">{terms.henchmanPlural}</h2>
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {warband.henchmenGroups.map((g) => (
              <ModelEntry
                key={g.id}
                title={g.groupName}
                subtitle={`${g.count}× ${g.unitType}${g.isAnimal ? '' : ` · ${g.xp} XP`}`}
                stats={g.stats}
                lines={groupLines(g)}
              />
            ))}
          </div>
        </section>
      )}

      {hired.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display uppercase tracking-[0.08em] text-sm border-b border-banner">
            {terms.hiredSpecialistPlural}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {hired.map((h) => (
              <ModelEntry
                key={h.id}
                title={h.name}
                subtitle={`${h.type} · ${h.xp} XP · upkeep ${h.upkeep} ${terms.currencyAbbr}`}
                stats={h.stats}
                lines={heroLines(h)}
              />
            ))}
          </div>
        </section>
      )}

      {warband.notes && (
        <section>
          <Line label="Notes" value={warband.notes} />
        </section>
      )}

      <footer className="pt-2 border-t border-steel-l font-body text-xs text-ink-faded">
        Mord Hive (v0.5 WIP) · hive.mordheimmanager.net · unofficial fan tool
      </footer>
    </div>
  );
}
