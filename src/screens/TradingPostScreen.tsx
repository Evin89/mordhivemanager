import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button } from '../components/ui';
import { strings } from '../strings';
import { generateId } from '../lib/id';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { getWarbandDefinition } from '../data/warbandRegistry';
import {
  getUniversalCommonItems,
  getWarbandExclusiveItems,
  ResolvedEquipmentItem,
} from '../lib/equipmentLookup';
import { EQUIPMENT_CATEGORY_LABELS, groupByCategory } from '../lib/equipmentCategories';
import { Warband } from '../types';

const { terms } = strings;

/**
 * The Trading Post: buy Common and warband-exclusive gear into the treasury,
 * sell items back from it at half price. No weapon-slot limits apply here — the
 * rules cap what a warrior *carries*, not what the warband owns.
 */
export default function TradingPostScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();
  const [notice, setNotice] = useState<string | null>(null);

  const definition = warband ? getWarbandDefinition(warband.warbandType) : undefined;
  const shopItems = useMemo<ResolvedEquipmentItem[]>(() => {
    const universal = getUniversalCommonItems();
    const exclusive = definition ? getWarbandExclusiveItems(definition) : [];
    return [...universal, ...exclusive];
  }, [definition]);

  if (!warband) return <Navigate to="/warbands" replace />;

  const treasuryGrouped = groupByCategory(warband.treasury);
  const shopGrouped = groupByCategory(shopItems);

  function buy(item: ResolvedEquipmentItem) {
    if (!warband) return;
    if (item.cost === null) {
      setNotice(`${item.name} has a variable price (${item.priceRange ?? 'see rules'}) — resolve it by hand.`);
      return;
    }
    if (item.cost > warband.gold) {
      setNotice(`Not enough thrones for ${item.name} (${item.cost} tn, you have ${warband.gold}).`);
      return;
    }
    const next: Warband = {
      ...warband,
      gold: warband.gold - item.cost,
      treasury: [
        ...warband.treasury,
        { id: generateId(), name: item.name, category: item.category, cost: item.cost, notes: item.notes },
      ],
    };
    saveWarband(next);
    setNotice(null);
  }

  function sell(itemId: string, cost: number) {
    if (!warband) return;
    saveWarband({
      ...warband,
      gold: warband.gold + Math.floor(cost / 2),
      treasury: warband.treasury.filter((i) => i.id !== itemId),
    });
  }

  return (
    <div>
      <BackHeader title="Trading Post" to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        <div className="flex justify-end">
          <PageChip>{warband.gold} {terms.currency}</PageChip>
        </div>
        {notice && <p className="font-body text-ink text-sm px-1">{notice}</p>}

        {/* Treasury */}
        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{warband.treasury.length}</PageChip>}>
            Treasury
          </BannerHeader>
          {warband.treasury.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">
              The treasury is empty. Buy gear below, or stash it from a model's wargear.
            </p>
          ) : (
            treasuryGrouped.map(({ category, items }) => (
              <Plate key={category} className="p-3">
                <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs mb-2">
                  {EQUIPMENT_CATEGORY_LABELS[category]}
                </p>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="font-body text-ink text-body-min">{item.name}</span>
                      <Button size="dense" variant="secondary" fullWidth={false} onClick={() => sell(item.id, item.cost ?? 0)}>
                        Sell ½ ({Math.floor((item.cost ?? 0) / 2)} tn)
                      </Button>
                    </li>
                  ))}
                </ul>
              </Plate>
            ))
          )}
        </section>

        {/* Shop */}
        <section className="space-y-3">
          <BannerHeader>Buy</BannerHeader>
          {shopGrouped.map(({ category, items }) => (
            <Plate key={category} className="p-3">
              <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs mb-2">
                {EQUIPMENT_CATEGORY_LABELS[category]}
              </p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="font-body text-ink text-body-min">{item.name}</span>
                      {(item.restriction || item.isRare) && (
                        <span className="block font-body text-ink-faded text-xs truncate">
                          {item.isRare ? `Rare ${item.rarity ?? ''}` : ''}
                          {item.isRare && item.restriction ? ' · ' : ''}
                          {item.restriction}
                        </span>
                      )}
                    </span>
                    <Button size="dense" fullWidth={false} onClick={() => buy(item)}>
                      {item.cost !== null ? `${item.cost} tn` : item.priceRange ?? 'var.'}
                    </Button>
                  </li>
                ))}
              </ul>
            </Plate>
          ))}
        </section>
      </div>
    </div>
  );
}
