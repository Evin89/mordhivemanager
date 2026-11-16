import { KeyboardEvent, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Plate from './Plate';
import { warbandDefinitionsByName } from '../data/warbandRegistry';
import { resolveSpecialRules } from '../lib/specialRulesLookup';
import skillsData from '../data/skills.json';
import { SkillList, WarbandDefinition } from '../data/types';
import { playerText } from '../lib/playerText';

const WARBAND_SKILLS = skillsData.warbandSpecific as Record<string, SkillList>;

/** The warband's own rules prose, split on the ` | ` separators the data uses between paragraphs. */
export function warbandRuleParagraphs(w: WarbandDefinition): string[] {
  return w.specialRules.split(' | ').map(playerText).filter(Boolean);
}

/** Every unit of the warband that prints special rules, heroes first. */
export function warbandUnitRules(w: WarbandDefinition) {
  return [
    ...w.heroSlots.map((u) => ({ unit: u.unitType, kind: 'Hero', rules: playerRules(u.specialRules) })),
    ...w.henchmenTypes.map((u) => ({ unit: u.unitType, kind: 'Henchmen', rules: playerRules(u.specialRules) })),
  ].filter((u) => u.rules.length > 0);
}

export function warbandSkills(w: WarbandDefinition) {
  return (WARBAND_SKILLS[w.id]?.skills ?? []).map((s) => ({ ...s, effect: playerText(s.effect) }));
}

function playerRules(rules: Parameters<typeof resolveSpecialRules>[0]) {
  return resolveSpecialRules(rules).map((r) => ({
    ...r,
    description: playerText(r.description),
    note: r.note ? playerText(r.note) || undefined : undefined,
  }));
}

/**
 * One tab per Mord Hive warband (A–Z). The open tab shows that warband's
 * special rules, the rules printed on each of its units, and its own skills.
 * The selected warband lives in `?warband=<slug>`, so a tab can be linked to.
 */
export default function WarbandRulesTabs() {
  const [params, setParams] = useSearchParams();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = warbandDefinitionsByName;
  const selectedIndex = Math.max(0, list.findIndex((w) => w.id === params.get('warband')));
  const selected = list[selectedIndex];

  function select(i: number, focus = false) {
    const w = list[(i + list.length) % list.length];
    const next = new URLSearchParams(params);
    next.set('warband', w.id);
    setParams(next, { replace: true, preventScrollReset: true });
    if (focus) {
      const el = tabs.current[list.indexOf(w)];
      el?.focus();
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const moves: Record<string, number> = {
      ArrowRight: selectedIndex + 1,
      ArrowLeft: selectedIndex - 1,
      Home: 0,
      End: list.length - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      select(moves[e.key], true);
    }
  }

  const paragraphs = warbandRuleParagraphs(selected);
  const units = warbandUnitRules(selected);
  const skills = warbandSkills(selected);

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Warbands"
        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x"
      >
        {list.map((w, i) => {
          const active = i === selectedIndex;
          return (
            <button
              key={w.id}
              ref={(el) => { tabs.current[i] = el; }}
              type="button"
              role="tab"
              id={`warband-tab-${w.id}`}
              aria-selected={active}
              aria-controls={`warband-panel-${w.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={onKeyDown}
              className={`snap-start shrink-0 min-h-[44px] px-3 font-ui font-semibold uppercase tracking-[0.06em] text-[15px] whitespace-nowrap border focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass focus-visible:outline-offset-2 ${
                active
                  ? 'bg-brass text-page border-brass'
                  : 'bg-plate text-ink border-steel-d hover:text-brass-text'
              }`}
            >
              {w.name}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`warband-panel-${selected.id}`}
        aria-labelledby={`warband-tab-${selected.id}`}
        tabIndex={0}
        className="space-y-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
      >
        <h3 className="font-display text-heading text-[28px] leading-tight">{selected.name}</h3>

        <section aria-label="Special rules" className="space-y-2">
          <h4 className="rules-label">Special rules</h4>
          <Plate className="p-3 space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="font-body text-ink text-body-min leading-relaxed">{p}</p>
            ))}
          </Plate>
        </section>

        {units.length > 0 && (
          <section aria-label="Unit rules" className="space-y-2">
            <h4 className="rules-label">Unit rules</h4>
            {units.map((u) => (
              <Plate key={`${u.kind}-${u.unit}`} className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{u.unit}</span>
                  <span className="font-body text-ink-faded text-xs shrink-0">{u.kind}</span>
                </div>
                <dl className="mt-2 space-y-2">
                  {u.rules.map((r, i) => (
                    <div key={`${r.name}-${i}`}>
                      <dt className="font-ui font-bold text-ink">{r.name}</dt>
                      <dd className="font-body text-ink text-body-min leading-relaxed">
                        {r.description}
                        {r.note && <span className="block text-ink-faded italic">{r.note}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Plate>
            ))}
          </section>
        )}

        {skills.length > 0 && (
          <section aria-label="Warband skills" className="space-y-2">
            <h4 className="rules-label">
              {WARBAND_SKILLS[selected.id]?.name ?? 'Warband skills'}
            </h4>
            {skills.map((s) => (
              <Plate key={s.name} className="p-3">
                <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{s.name}</span>
                <p className="mt-1 font-body text-ink text-body-min leading-relaxed">{s.effect}</p>
              </Plate>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
