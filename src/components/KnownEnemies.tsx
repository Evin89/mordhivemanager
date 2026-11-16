import { NemesisHero } from '../lib/hiveCampaign';
import BannerHeader from './BannerHeader';
import Plate from './Plate';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function KnownEnemies({ heroes }: { heroes: NemesisHero[] }) {
  return (
    <section className="space-y-3">
      <BannerHeader>Known enemies</BannerHeader>
      <Plate className="p-4 space-y-4">
        {heroes.map((hero) => (
          <div key={hero.id} className={hero.status === 'dead' ? 'line-through text-ink-faded' : 'text-ink'}>
            <p className="font-ui text-lg">{hero.name}{hero.isLeader && hero.status === 'active' ? ' · Leader' : ''}{hero.status === 'dead' ? ' · Dead' : ''}</p>
            <p className="font-body text-sm">{hero.role} · {plural(hero.battles, 'battle')} · {plural(hero.timesDown, 'time')} down · {plural(hero.scars, 'scar')}</p>
          </div>
        ))}
      </Plate>
    </section>
  );
}
