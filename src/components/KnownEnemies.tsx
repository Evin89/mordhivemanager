import { NemesisHero } from '../lib/hiveCampaign';
import BannerHeader from './BannerHeader';
import Plate from './Plate';

export default function KnownEnemies({ heroes }: { heroes: NemesisHero[] }) {
  return (
    <section className="space-y-3">
      <BannerHeader>Known enemies</BannerHeader>
      <Plate className="p-4 space-y-4">
        {heroes.map((hero) => (
          <div key={hero.id} className={hero.status === 'dead' ? 'line-through text-ink-faded' : 'text-ink'}>
            <p className="font-ui text-lg">{hero.name}{hero.isLeader ? ' · Leader' : ''}{hero.status === 'dead' ? ' · Dead' : ''}</p>
            <p className="font-body text-sm">{hero.role} · {hero.battles} battles · {hero.timesDown} times down · {hero.scars} scars</p>
          </div>
        ))}
      </Plate>
    </section>
  );
}
