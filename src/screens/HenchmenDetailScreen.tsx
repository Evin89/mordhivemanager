import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import ProfileBlock from '../components/ProfileBlock';
import EquipmentManager from '../components/EquipmentManager';
import { Button, TextField } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { getWarbandDefinition } from '../data/warbandRegistry';
import { HenchmenGroup, StatLine, Warband } from '../types';

const { terms } = strings;

/** View and manage a Henchmen group: name, size, shared profile, shared loadout.
 * A group advances together, so XP is per-model ("each"). */
export default function HenchmenDetailScreen() {
  const { warbandId, groupId } = useParams<{ warbandId: string; groupId: string }>();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();
  const [notice, setNotice] = useState<string | null>(null);

  if (!warband) return <Navigate to="/warbands" replace />;
  const group = warband.henchmenGroups.find((g) => g.id === groupId);
  if (!group) return <Navigate to={`/warbands/${warband.id}`} replace />;
  const definition = getWarbandDefinition(warband.warbandType);
  const type = definition?.henchmenTypes.find((t) => t.unitType === group.unitType);

  function patchWarband(next: Warband) {
    saveWarband(next);
  }
  function patchGroup(mutate: (g: HenchmenGroup) => HenchmenGroup) {
    if (!warband) return;
    patchWarband({
      ...warband,
      henchmenGroups: warband.henchmenGroups.map((g) => (g.id === group!.id ? mutate(g) : g)),
    });
  }

  return (
    <div>
      <BackHeader title={group.groupName} to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        <Plate className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <PageChip>{group.count}x {group.unitType}</PageChip>
            <PageChip>{group.xp} XP each</PageChip>
            {group.isAnimal && <PageChip>Animal</PageChip>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Group name</span>
              <TextField value={group.groupName} onChange={(e) => patchGroup((g) => ({ ...g, groupName: e.target.value }))} />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Models</span>
              <input
                type="number"
                min={0}
                value={group.count}
                onChange={(e) => patchGroup((g) => ({ ...g, count: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                className="w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink tabular-nums focus:outline-none focus:border-banner"
              />
            </label>
          </div>
          <p className="font-body text-ink-faded text-xs">
            Editing the model count here records casualties — it doesn't charge or refund thrones. Recruit more from the roster.
          </p>
        </Plate>

        <section className="space-y-3">
          <BannerHeader>Profile (each)</BannerHeader>
          <Plate className="p-4">
            <ProfileBlock
              stats={group.stats}
              onStatChange={(key: keyof StatLine, val) => patchGroup((g) => ({ ...g, stats: { ...g.stats, [key]: val } }))}
            />
          </Plate>
        </section>

        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{warband.gold} {terms.currencyAbbr}</PageChip>}>
            Wargear (shared)
          </BannerHeader>
          {notice && <p className="font-body text-ink text-sm px-1">{notice}</p>}
          <EquipmentManager
            equipment={group.equipment}
            equipmentListIds={type?.equipmentOptions ?? []}
            definition={definition}
            gold={warband.gold}
            onBuy={(item, cost) => {
              patchWarband({
                ...warband,
                gold: warband.gold - cost,
                henchmenGroups: warband.henchmenGroups.map((g) =>
                  g.id === group.id ? { ...g, equipment: [...g.equipment, item] } : g,
                ),
              });
              setNotice(null);
            }}
            onSell={(itemId, refund) =>
              patchWarband({
                ...warband,
                gold: warband.gold + refund,
                henchmenGroups: warband.henchmenGroups.map((g) =>
                  g.id === group.id ? { ...g, equipment: g.equipment.filter((i) => i.id !== itemId) } : g,
                ),
              })
            }
            onStash={(itemId) => {
              const item = group.equipment.find((i) => i.id === itemId);
              if (!item) return;
              patchWarband({
                ...warband,
                treasury: [...warband.treasury, item],
                henchmenGroups: warband.henchmenGroups.map((g) =>
                  g.id === group.id ? { ...g, equipment: g.equipment.filter((i) => i.id !== itemId) } : g,
                ),
              });
            }}
            onSlotBlocked={(msg) => setNotice(msg)}
          />
        </section>

        <section className="space-y-3">
          <BannerHeader>Notes</BannerHeader>
          <Plate className="p-2">
            <textarea
              value={group.notes}
              onChange={(e) => patchGroup((g) => ({ ...g, notes: e.target.value }))}
              rows={4}
              className="w-full bg-plate px-3 py-2 text-ink font-body focus:outline-none resize-y"
            />
          </Plate>
        </section>

        <div className="pt-2">
          <Button
            variant="danger"
            fullWidth={false}
            onClick={() => {
              if (window.confirm(`Disband ${group.groupName}?`)) {
                patchWarband({ ...warband, henchmenGroups: warband.henchmenGroups.filter((g) => g.id !== group.id) });
              }
            }}
          >
            Disband group
          </Button>
        </div>
      </div>
    </div>
  );
}
