import { Battlefield } from '../lib/battlefield';

/**
 * Renders a generated battlefield as an SVG, in the Codex palette (steel-outlined
 * ruins on the page ground, black objective, diamantine glints). Colours come
 * from the theme's CSS variables, so it re-themes with everything else.
 */
export default function BattlefieldMap({ field }: { field: Battlefield }) {
  const s = field.size;
  const c = (name: string) => {
    const roles: Record<string, string> = { plate: 'cog', page: 'cog', steel: 'phosphor-faint', 'steel-l': 'cog-border', ink: 'phosphor', bolt: 'phosphor-dim', banner: 'phosphor' };
    return `rgb(var(--color-${roles[name] ?? name}))`;
  };

  return (
    <svg viewBox={`-2 -2 ${s + 4} ${s + 4}`} className="w-full h-auto" role="img" aria-label="Generated battlefield">
      {/* Board ground */}
      <rect x={-2} y={-2} width={s + 4} height={s + 4} fill="transparent" />
      <rect x={0} y={0} width={s} height={s} fill="none" stroke={c('steel')} strokeWidth={0.8} />

      {/* Deployment zones */}
      {field.zones.map((z, i) => (
        <g key={`z${i}`}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={c('steel-l')} fillOpacity={0.35} stroke={c('steel')} strokeWidth={0.4} strokeDasharray="2 2" />
        </g>
      ))}

      {/* Ruined buildings */}
      {field.buildings.map((b, i) => (
        <g key={`b${i}`}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={c('page')} stroke={c('ink')} strokeWidth={0.9} />
          {/* corner rivets */}
          {[[b.x + 1.5, b.y + 1.5], [b.x + b.w - 1.5, b.y + 1.5], [b.x + 1.5, b.y + b.h - 1.5], [b.x + b.w - 1.5, b.y + b.h - 1.5]].map(([cx, cy], k) => (
            <circle key={k} cx={cx} cy={cy} r={0.7} fill={c('bolt')} />
          ))}
        </g>
      ))}

      {/* Markers */}
      {field.markers.map((m, i) =>
        m.kind === 'objective' ? (
          <g key={`m${i}`}>
            <rect x={m.x - 4} y={m.y - 4} width={8} height={8} fill={c('banner')} transform={`rotate(45 ${m.x} ${m.y})`} />
          </g>
        ) : (
          <path
            key={`m${i}`}
            d={`M ${m.x} ${m.y - 2.5} L ${m.x + 2.5} ${m.y} L ${m.x} ${m.y + 2.5} L ${m.x - 2.5} ${m.y} Z`}
            fill={c('banner')}
            stroke={c('plate')}
            strokeWidth={0.4}
          />
        ),
      )}
      {field.markers.map((m, i) => <text key={`label${i}`} x={m.x} y={m.y - 5} textAnchor="middle" fontSize={2.5} fill={c('ink')}>{m.label}</text>)}
    </svg>
  );
}
