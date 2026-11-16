import { normalizeHive, controlLabel, HiveState, reachableSectors, SECTORS, SectorId } from '../lib/hiveCampaign';

type Props = { state: HiveState; selected: SectorId; onSelect: (sector: SectorId) => void };

export default function HiveMap({ state, selected, onSelect }: Props) {
  state = normalizeHive(state);
  const reachable = reachableSectors(state.control, state.dark);
  return (
    <div className="hive-map">
      <picture>
        <source media="(max-width: 899px)" srcSet="/img/descent-sm.jpg" />
        <img src="/img/descent.jpg" alt="Cutaway of Mord Hive, from the spire to the sump" />
      </picture>
      <div className="hive-map-bands">
        {SECTORS.map((sector) => {
          const value = state.control[sector.id];
          const mission = state.board.some((item) => item.sector === sector.id);
          return (
            <button
              disabled={state.dark!.includes(sector.id)}
              style={state.dark!.includes(sector.id) ? { filter: 'grayscale(1)', opacity: 0.55 } : undefined}
              key={sector.id}
              type="button"
              className={`hive-map-band ${reachable.includes(sector.id) ? 'reachable' : 'unreachable'}`}
              aria-pressed={selected === sector.id}
              aria-label={`${sector.name}: ${controlLabel(value)}, control ${value}. ${reachable.includes(sector.id) ? 'Reachable' : 'Unreachable'}.${mission ? ' Mission available.' : ''}`}
              onClick={() => onSelect(sector.id)}
            >
              <span className="font-ui">{sector.name}{mission && <span aria-hidden="true"> ◆</span>}</span>
              {state.lastSeen === sector.id && <span className="hive-last-seen">last seen</span>}
              {state.dark!.includes(sector.id) ? <span>Gone dark</span> : <span className="hive-pips" aria-hidden="true">
                {[-3, -2, -1, 0, 1, 2, 3].map((pip) => (
                  <span key={pip} className={pip === value ? `marked ${value < 0 ? 'enemy' : value > 0 ? 'yours' : 'neutral'}` : ''} />
                ))}
              </span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
