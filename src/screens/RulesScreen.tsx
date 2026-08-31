import { useMemo, useState } from 'react';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { TextField } from '../components/ui';
import skillsData from '../data/skills.json';
import spellsData from '../data/spells.json';
import equipmentData from '../data/equipment.json';
import { warbandDefinitionsByName } from '../data/warbandRegistry';
import { EQUIPMENT_CATEGORY_LABELS, groupByCategory } from '../lib/equipmentCategories';
import { EquipmentCategory } from '../types';
import { SkillList, SpellList } from '../data/types';

type Entry = { title: string; body: string; sub?: string };
type Section = { id: string; heading: string; entries: Entry[] };

/**
 * A searchable, offline rules reference generated from the app's own data, so a
 * rule on a datasheet and a rule here can't disagree. Covers the skill lists,
 * the wargear chart, psyker/prayer lists, and each warband's special rules.
 */
export default function RulesScreen() {
  const [query, setQuery] = useState('');

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];

    // Core + warband-specific skills
    const skillLists = [
      ...Object.values(skillsData.lists as Record<string, SkillList>),
      ...Object.values(skillsData.warbandSpecific as Record<string, SkillList>),
    ];
    out.push({
      id: 'skills',
      heading: 'Skills',
      entries: skillLists.flatMap((list) =>
        list.skills.map((s) => ({ title: s.name, sub: list.name, body: s.effect })),
      ),
    });

    // Wargear chart
    const items = equipmentData.common.map((e) => ({
      title: e.name,
      sub: EQUIPMENT_CATEGORY_LABELS[e.category as EquipmentCategory],
      body: `${e.cost ?? '?'} tn${e.notes ? ` — ${e.notes}` : ''}`,
      category: e.category as EquipmentCategory,
    }));
    out.push({
      id: 'wargear',
      heading: 'Wargear',
      entries: groupByCategory(items).flatMap((g) => g.items.map(({ title, sub, body }) => ({ title, sub, body }))),
    });

    // Psyker / prayer lists
    const spellLists = Object.values(spellsData.lists as Record<string, SpellList>);
    out.push({
      id: 'powers',
      heading: 'Psychic Powers & Prayers',
      entries: spellLists.flatMap((list) =>
        list.spells.map((sp) => ({
          title: sp.name,
          sub: `${list.name}${sp.difficulty !== null ? ` · Difficulty ${sp.difficulty}` : ''}`,
          body: sp.effect,
        })),
      ),
    });

    // Warband special rules
    out.push({
      id: 'warband-rules',
      heading: 'Warband Special Rules',
      entries: warbandDefinitionsByName.map((w) => ({ title: w.name, body: w.specialRules })),
    });

    return out;
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        entries: s.entries.filter((e) =>
          `${e.title} ${e.sub ?? ''} ${e.body}`.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.entries.length > 0);
  }, [sections, q]);

  return (
    <div className="space-y-6">
      <BannerHeader as="h1">Rules Reference</BannerHeader>
      <p className="font-body text-ink text-body-min">
        Generated live from the app's own Mord Hive v0.5 data. Search skills, wargear, psychic
        powers and prayers, and every warband's special rules.
      </p>
      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the rules…"
        aria-label="Search the rules"
      />

      {filtered.length === 0 && <p className="font-body text-ink-faded">No matches.</p>}

      {filtered.map((section) => (
        <section key={section.id} className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{section.entries.length}</PageChip>}>
            {section.heading}
          </BannerHeader>
          {/* Collapsed by default when not searching, so the page opens as a chapter list. */}
          <details open={!!q || section.entries.length <= 12}>
            <summary className="cursor-pointer font-display uppercase tracking-[0.05em] text-ink-faded text-sm px-1 py-1 select-none">
              {q ? 'Matches' : 'Show entries'}
            </summary>
            <div className="mt-2 space-y-2">
              {section.entries.map((e, i) => (
                <Plate key={`${e.title}-${i}`} className="p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{e.title}</span>
                    {e.sub && <span className="font-body text-ink-faded text-xs shrink-0">{e.sub}</span>}
                  </div>
                  <p className="mt-1 font-body text-ink text-body-min leading-relaxed">{e.body}</p>
                </Plate>
              ))}
            </div>
          </details>
        </section>
      ))}
    </div>
  );
}
