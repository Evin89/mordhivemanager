import { Link } from 'react-router-dom';
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
import { playerText } from '../lib/playerText';
import WarbandRulesTabs, { warbandRuleParagraphs, warbandSkills, warbandUnitRules } from '../components/WarbandRulesTabs';

/** Official Mord Hive links, as published by its author (Nick) in the v0.5 rulebook and his announcement post. */
const RESOURCES = [
  {
    label: 'Mord Hive v0.5 rulebook (PDF)',
    href: 'https://drive.google.com/drive/folders/1rSFnIEstQpbZh11AdRdanLLqK31RwCsF?usp=sharing',
    note: "the author's Google Drive folder with the full rules",
  },
  { label: 'Feedback form', href: 'https://forms.gle/voZxiSghBGDbFAB79', note: 'send rules feedback to the author' },
  { label: 'Mord Hive on Reddit', href: 'https://www.reddit.com/r/MordHive/', note: 'r/MordHive' },
  { label: 'Mord Hive on Facebook', href: 'https://www.facebook.com/share/g/1EbEMuzzpb/', note: 'the Facebook group' },
];

type Entry = { title: string; body: string; sub?: string; group?: string };
/** `grouped`: render one dropdown per `entry.group` (e.g. each psychic discipline) instead of one flat list. */
/** `tabs`: when not searching, render the section as one tab per warband instead. */
type Section = { id: string; heading: string; entries: Entry[]; grouped?: boolean; tabs?: boolean };

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
        list.skills.map((s) => ({ title: s.name, sub: list.name, body: playerText(s.effect) })),
      ),
    });

    // Wargear chart
    const items = equipmentData.common.map((e) => ({
      title: e.name,
      sub: EQUIPMENT_CATEGORY_LABELS[e.category as EquipmentCategory],
      body: `${e.cost ?? '?'} tn${e.notes && playerText(e.notes) ? ` — ${playerText(e.notes)}` : ''}`,
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
      grouped: true,
      entries: spellLists.flatMap((list) =>
        list.spells.map((sp) => ({
          title: sp.name,
          group: list.name,
          sub: sp.difficulty !== null ? `Difficulty ${sp.difficulty}` : undefined,
          body: playerText(sp.effect),
        })),
      ),
    });

    // Warbands: one tab each (see WarbandRulesTabs). The entries below only feed
    // the search, so a rule found by searching names its warband.
    out.push({
      id: 'warband-rules',
      heading: 'Warbands',
      grouped: true,
      tabs: true,
      entries: warbandDefinitionsByName.flatMap((w) => [
        ...warbandRuleParagraphs(w).map((body) => ({ title: 'Special Rules', group: w.name, body })),
        ...warbandUnitRules(w).flatMap((u) =>
          u.rules.map((r) => ({
            title: r.name,
            group: w.name,
            sub: u.unit,
            body: r.note ? `${r.description} ${r.note}` : r.description,
          })),
        ),
        ...warbandSkills(w).map((sk) => ({ title: sk.name, group: w.name, sub: 'Warband skill', body: sk.effect })),
      ]),
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
          `${e.title} ${e.group ?? ''} ${e.sub ?? ''} ${e.body}`.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.entries.length > 0);
  }, [sections, q]);

  return (
    <div className="space-y-6">
      <BannerHeader as="h1">Rules Reference</BannerHeader>
      <Link to="/scenarios" className="inline-flex items-center min-h-[44px] underline">Open scenario generator</Link>
      <p className="font-body text-ink text-body-min">
        Generated live from the app's own Mord Hive v0.5 data. Search skills, wargear, psychic
        powers and prayers, and every warband's special rules, unit rules and own skills.
      </p>
      <section aria-label="Resources" className="space-y-3">
        <BannerHeader as="h2">Resources</BannerHeader>
        <Plate className="p-3">
          <ul className="space-y-1 font-body text-ink text-body-min">
            {RESOURCES.map((r) => (
              <li key={r.href}>
                <a className="inline-flex items-center min-h-[44px] underline text-brass-text" href={r.href} target="_blank" rel="noopener noreferrer">
                  {r.label}
                </a>
                <span className="text-ink-faded"> — {r.note}</span>
              </li>
            ))}
          </ul>
        </Plate>
      </section>

      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the rules…"
        aria-label="Search the rules"
      />

      {filtered.length === 0 && <p className="font-body text-ink-faded">No matches.</p>}

      {filtered.map((section) => (
        <section key={section.id} className="space-y-3">
          <BannerHeader
            trailing={
              <PageChip className="border-on-banner/40">
                {section.tabs && !q ? warbandDefinitionsByName.length : section.entries.length}
              </PageChip>
            }
          >
            {section.heading}
          </BannerHeader>
          {section.tabs && !q ? (
            <WarbandRulesTabs />
          ) : section.grouped ? (
            /* One dropdown per discipline; all closed until you open one or search. */
            <div className="space-y-2">
              {groupEntries(section.entries).map(([group, entries]) => (
                <details key={group} open={!!q}>
                  <summary className="cursor-pointer flex items-center justify-between gap-2 min-h-[44px] px-3 bg-plate border border-steel-d font-display uppercase tracking-[0.05em] text-ink text-sm select-none">
                    <span>{group}</span>
                    <PageChip>{entries.length}</PageChip>
                  </summary>
                  <EntryList entries={entries} />
                </details>
              ))}
            </div>
          ) : (
            /* Collapsed by default when not searching, so the page opens as a chapter list. */
            <details open={!!q || section.entries.length <= 12}>
              <summary className="cursor-pointer font-display uppercase tracking-[0.05em] text-ink-faded text-sm px-1 py-1 select-none">
                {q ? 'Matches' : 'Show entries'}
              </summary>
              <EntryList entries={section.entries} />
            </details>
          )}
        </section>
      ))}
    </div>
  );
}

/** Groups entries by `group`, keeping the order in which groups first appear. */
function groupEntries(entries: Entry[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = e.group ?? 'Other';
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.entries()];
}

function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <div className="mt-2 space-y-2">
      {entries.map((e, i) => (
        <Plate key={`${e.title}-${i}`} className="p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{e.title}</span>
            {e.sub && <span className="font-body text-ink-faded text-xs shrink-0">{e.sub}</span>}
          </div>
          <p className="mt-1 font-body text-ink text-body-min leading-relaxed">{e.body}</p>
        </Plate>
      ))}
    </div>
  );
}
