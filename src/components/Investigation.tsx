import { useState } from 'react';
import type { CampaignAgenda } from '../lib/soloAgenda';
import { dossierEntries, normalizeHive, sectorName, type HiveState, type NemesisHero, type PrisonerAction } from '../lib/hiveCampaign';
import { PORTRAIT_SETS, portraitUrl } from '../data/portraits';
import { getWarbandDefinition } from '../data/warbandRegistry';
import { shareWantedBill } from '../lib/wantedBill';
import { Button } from './ui';
import Plate from './Plate';
import Portrait from './Portrait';

export function SchemeClock({ scheme }: { scheme: number }) {
  return (
    <div aria-label={`Scheme ${scheme} of 12`} className="space-y-2">
      <p className="font-ui text-ink">Scheme {scheme} / 12</p>
      <div className="grid grid-cols-3 gap-3">
        {['Act I', 'Act II', 'Act III'].map((label, act) => (
          <div key={label}>
            <p className="font-ui text-ink">{label}</p>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((segment) => (
                <span key={segment} className="h-4 flex-1 border border-brass" style={{ background: scheme > act * 4 + segment ? '#7A1F1A' : '#26211C' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DossierLines({ agenda, clues }: { agenda: CampaignAgenda; clues: number }) {
  return (
    <div className="space-y-4">
      {dossierEntries(agenda, clues).map((item) => (
        <div key={item.name}>
          <h3 className="font-ui text-lg">{item.name}{!item.open && ` · ${item.needed} clues`}</h3>
          {item.open ? <p className="font-body">{item.text}</p> : <div aria-label="Redacted" className="h-5 w-4/5 bg-black" />}
        </div>
      ))}
    </div>
  );
}

export function Dossier({ agenda, clues }: { agenda: CampaignAgenda; clues: number }) {
  return (
    <section className="vellum-sheet p-5 space-y-4">
      <h2 className="font-display text-3xl">Dossier</h2>
      <DossierLines agenda={agenda} clues={clues} />
    </section>
  );
}

export function billPortrait(type: string, role: string): string | null {
  const slot = getWarbandDefinition(type)?.heroSlots.find((item) => item.unitType === role);
  const set = PORTRAIT_SETS[type];
  return set ? portraitUrl(type, (slot && set.defaultBySlotId[slot.id]) ?? 3) : null;
}

function Bill({ hero, state, agenda, faction, type }: { hero: NemesisHero; state: HiveState; agenda: CampaignAgenda; faction: string; type: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const portrait = billPortrait(type, hero.role);
  async function share() {
    setBusy(true);
    setError('');
    try {
      await shareWantedBill(hero, state, agenda, faction, portrait);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Could not share bill.');
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="vellum-sheet wanted-bill p-5 space-y-4 min-w-0 break-words">
      <h2 className="font-display text-5xl text-center">WANTED</h2>
      <Portrait large src={portrait} alt="" />
      {hero.status === 'dead' && <p className="wanted-deceased font-ui text-3xl text-center">DECEASED</p>}
      <h3 className="font-display text-3xl text-center">{hero.name}</h3>
      <p className="font-ui text-center">{hero.role === faction ? faction : `${hero.role} · ${faction}`}</p>
      <p className="font-ui text-center">Last seen: {sectorName(normalizeHive(state).lastSeen)}</p>
      <p className="font-mono text-sm text-center">{hero.battles} battles · {hero.timesDown} times down · {hero.scars} scars{hero.grudge ? ' · holds a grudge' : ''}</p>
      <DossierLines agenda={agenda} clues={state.outcome ? 8 : normalizeHive(state).clues} />
      <Button onClick={share} disabled={busy}>{busy ? 'Rendering...' : 'Share bill'}</Button>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}

export function WantedBills(props: { state: HiveState; agenda: CampaignAgenda; faction: string; type: string }) {
  const state = normalizeHive(props.state);
  const current = state.nemesis.find((hero) => hero.isLeader && hero.status === 'active');
  const deceased = [...state.nemesis].reverse().find((hero) => hero.isLeader && hero.status === 'dead');
  return (
    <div className="space-y-4">
      {[deceased, current].filter((hero): hero is NemesisHero => !!hero).map((hero) => <Bill key={hero.id} {...props} hero={hero} />)}
    </div>
  );
}

export function Prisoners({ state, onAction }: { state: HiveState; onAction: (id: string, action: PrisonerAction) => void }) {
  const prisoners = state.nemesis.filter((hero) => hero.status === 'captured');
  if (!prisoners.length) return null;
  return (
    <Plate className="p-4 space-y-4">
      <h2 className="font-ui text-brass-text text-2xl">Prisoners</h2>
      {prisoners.map((hero) => (
        <div key={hero.id} className="space-y-2">
          <p className="font-body text-ink">{hero.name}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!!state.outcome || !!state.activeMissionId} onClick={() => onAction(hero.id, 'interrogate')}>Interrogate</Button>
            <Button disabled={!!state.outcome || !!state.activeMissionId} onClick={() => onAction(hero.id, 'trade')}>Trade back</Button>
            <Button disabled={!!state.outcome || !!state.activeMissionId} onClick={() => onAction(hero.id, 'example')}>Make an example</Button>
          </div>
        </div>
      ))}
    </Plate>
  );
}
