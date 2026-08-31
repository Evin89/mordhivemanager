import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import ProfileBlock from '../components/ProfileBlock';
import EquipmentManager from '../components/EquipmentManager';
import SkillManager from '../components/SkillManager';
import { Button, TextField } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { getWarbandDefinition } from '../data/warbandRegistry';
import { Hero, StatLine, Warband, ModelStatus } from '../types';

const { terms } = strings;

const STATUS_LABELS: Record<ModelStatus, string> = {
  active: 'Active',
  missNextGame: 'Misses next game',
  dead: 'Dead',
  captured: 'Captured',
  left: 'Left the warband',
};

/** View and manage a single Hero: identity, profile, XP, skills, wargear. Auto-saves
 * to the local store on each change (cheap for localStorage; no explicit save bar). */
export default function HeroDetailScreen() {
  const { warbandId, heroId } = useParams<{ warbandId: string; heroId: string }>();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();
  const [notice, setNotice] = useState<string | null>(null);

  if (!warband) return <Navigate to="/warbands" replace />;
  const hero = warband.heroes.find((h) => h.id === heroId);
  if (!hero) return <Navigate to={`/warbands/${warband.id}`} replace />;
  const definition = getWarbandDefinition(warband.warbandType);
  const slot = definition?.heroSlots.find((s) => s.unitType === hero.unitType);

  function patchWarband(next: Warband) {
    saveWarband(next);
  }
  function patchHero(mutate: (h: Hero) => Hero) {
    if (!warband) return;
    patchWarband({ ...warband, heroes: warband.heroes.map((h) => (h.id === hero!.id ? mutate(h) : h)) });
  }

  return (
    <div>
      <BackHeader title={hero.name} to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        {/* Identity */}
        <Plate className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <PageChip>{hero.unitType}</PageChip>
            {hero.isLeader && <PageChip>Leader</PageChip>}
            <PageChip>{hero.xp} XP</PageChip>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Name</span>
              <TextField value={hero.name} onChange={(e) => patchHero((h) => ({ ...h, name: e.target.value }))} />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Nickname</span>
              <TextField
                value={hero.nickname ?? ''}
                placeholder="optional"
                onChange={(e) => patchHero((h) => ({ ...h, nickname: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Experience</span>
              <input
                type="number"
                min={0}
                value={hero.xp}
                onChange={(e) => patchHero((h) => ({ ...h, xp: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                className="w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink tabular-nums focus:outline-none focus:border-banner"
              />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Status</span>
              <select
                value={hero.status}
                onChange={(e) => patchHero((h) => ({ ...h, status: e.target.value as ModelStatus }))}
                className="w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink focus:outline-none focus:border-banner"
              >
                {(Object.keys(STATUS_LABELS) as ModelStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
        </Plate>

        {/* Profile */}
        <section className="space-y-3">
          <BannerHeader>Profile</BannerHeader>
          <Plate className="p-4">
            <ProfileBlock
              stats={hero.stats}
              maximums={hero.statMaximums}
              showMaximums={hero.statMaximums && Object.values(hero.statMaximums).some((v) => v > 0) ? true : false}
              onStatChange={(key: keyof StatLine, val) =>
                patchHero((h) => ({ ...h, stats: { ...h.stats, [key]: val } }))
              }
            />
            <p className="mt-2 font-body text-ink-faded text-xs">Edit a value to record an advance or correction.</p>
          </Plate>
        </section>

        {/* Skills */}
        <section className="space-y-3">
          <BannerHeader>Skills</BannerHeader>
          <SkillManager
            skillLists={hero.skillLists}
            spellLists={hero.spellLists}
            knownSkills={hero.skills}
            isLeader={hero.isLeader}
            warbandType={warband.warbandType}
            onAdd={(name) => patchHero((h) => ({ ...h, skills: [...h.skills, name] }))}
            onRemove={(name) => patchHero((h) => ({ ...h, skills: h.skills.filter((s) => s !== name) }))}
          />
        </section>

        {/* Equipment */}
        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{warband.gold} {terms.currencyAbbr}</PageChip>}>
            Wargear
          </BannerHeader>
          {notice && <p className="font-body text-ink text-sm px-1">{notice}</p>}
          <EquipmentManager
            equipment={hero.equipment}
            equipmentListIds={slot?.equipmentOptions ?? []}
            definition={definition}
            gold={warband.gold}
            allowHenchmenMisc
            onBuy={(item, cost) => {
              patchWarband({
                ...warband,
                gold: warband.gold - cost,
                heroes: warband.heroes.map((h) => (h.id === hero.id ? { ...h, equipment: [...h.equipment, item] } : h)),
              });
              setNotice(null);
            }}
            onSell={(itemId, refund) => {
              patchWarband({
                ...warband,
                gold: warband.gold + refund,
                heroes: warband.heroes.map((h) =>
                  h.id === hero.id ? { ...h, equipment: h.equipment.filter((i) => i.id !== itemId) } : h,
                ),
              });
            }}
            onStash={(itemId) => {
              const item = hero.equipment.find((i) => i.id === itemId);
              if (!item) return;
              patchWarband({
                ...warband,
                treasury: [...warband.treasury, item],
                heroes: warband.heroes.map((h) =>
                  h.id === hero.id ? { ...h, equipment: h.equipment.filter((i) => i.id !== itemId) } : h,
                ),
              });
            }}
            onSlotBlocked={(msg) => setNotice(msg)}
          />
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <BannerHeader>Notes</BannerHeader>
          <Plate className="p-2">
            <textarea
              value={hero.notes}
              onChange={(e) => patchHero((h) => ({ ...h, notes: e.target.value }))}
              rows={4}
              className="w-full bg-plate px-3 py-2 text-ink font-body focus:outline-none resize-y"
              placeholder="Unit rules, injuries, story…"
            />
          </Plate>
        </section>

        <div className="pt-2">
          <Button
            variant="danger"
            fullWidth={false}
            onClick={() => {
              if (window.confirm(`Remove ${hero.name} from the warband?`)) {
                patchWarband({ ...warband, heroes: warband.heroes.filter((h) => h.id !== hero.id) });
              }
            }}
          >
            Remove hero
          </Button>
        </div>
      </div>
    </div>
  );
}
