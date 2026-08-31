import { useMemo, useState } from 'react';
import Plate from './Plate';
import { Button } from './ui';
import { generateId } from '../lib/id';
import { WarbandDefinition } from '../data/types';
import { EquipmentItem } from '../types';
import { resolveEquipmentItem, ResolvedEquipmentItem } from '../lib/equipmentLookup';
import { EQUIPMENT_CATEGORY_LABELS, EQUIPMENT_CATEGORY_SHORT_LABELS, groupByCategory } from '../lib/equipmentCategories';
import { canAddWeapon, countWeaponSlots, MAX_MELEE, MAX_MISSILE_TYPES } from '../lib/weaponSlots';

type EquipmentManagerProps = {
  equipment: EquipmentItem[];
  /** Keys into the warband definition's `equipmentLists`. */
  equipmentListIds: string[];
  definition: WarbandDefinition | undefined;
  gold: number;
  /** Henchmen groups share a loadout; hides per-model-only affordances if false. */
  allowHenchmenMisc?: boolean;
  onBuy: (item: EquipmentItem, cost: number) => void;
  onSell: (itemId: string, refund: number) => void;
  onStash: (itemId: string) => void;
  onSlotBlocked: (message: string) => void;
};

/**
 * The wargear panel shared by the Hero and Henchmen detail screens: the model's
 * current loadout with sell/stash actions, and a shop drawn from the unit's own
 * equipment lists. Enforces the §-weapon-slot limits (two close combat weapons
 * plus the free dagger, two different missile weapons) and gold on purchase.
 */
export default function EquipmentManager({
  equipment,
  equipmentListIds,
  definition,
  gold,
  onBuy,
  onSell,
  onStash,
  onSlotBlocked,
}: EquipmentManagerProps) {
  const [shopOpen, setShopOpen] = useState(false);

  // The union of item ids the unit's lists allow, resolved and de-duped.
  const shopItems = useMemo<ResolvedEquipmentItem[]>(() => {
    if (!definition) return [];
    const ids = new Set<string>();
    for (const listId of equipmentListIds) {
      for (const id of definition.equipmentLists[listId] ?? []) ids.add(id);
    }
    return [...ids]
      .map((id) => resolveEquipmentItem(id, definition))
      .filter((i): i is ResolvedEquipmentItem => !!i);
  }, [definition, equipmentListIds]);

  const usage = countWeaponSlots(equipment);
  const grouped = groupByCategory(equipment);
  const shopGrouped = groupByCategory(shopItems);

  function handleBuy(item: ResolvedEquipmentItem) {
    if (item.cost === null) {
      onSlotBlocked(`${item.name} has a variable price (${item.priceRange ?? 'see rules'}) — add it by hand for now.`);
      return;
    }
    if (item.cost > gold) {
      onSlotBlocked(`Not enough thrones for ${item.name} (${item.cost} tn, you have ${gold}).`);
      return;
    }
    const verdict = canAddWeapon(equipment, item);
    if (!verdict.allowed) {
      onSlotBlocked(
        verdict.reason === 'meleeFull'
          ? `Close combat weapons are full (max ${MAX_MELEE} plus the free dagger).`
          : `Missile weapons are full (max ${MAX_MISSILE_TYPES} different).`,
      );
      return;
    }
    onBuy(
      { id: generateId(), name: item.name, category: item.category, cost: item.cost, notes: item.notes },
      item.cost,
    );
  }

  return (
    <div className="space-y-3">
      {/* Slot usage */}
      <p className="font-display uppercase tracking-[0.05em] text-ink-faded text-xs px-1">
        {usage.melee}/{MAX_MELEE} close combat · {usage.missileTypes}/{MAX_MISSILE_TYPES} missile
      </p>

      {/* Current loadout */}
      {equipment.length === 0 ? (
        <p className="font-body text-ink-faded text-sm px-1">No wargear.</p>
      ) : (
        grouped.map(({ category, items }) => (
          <Plate key={category} className="p-3">
            <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs mb-2">
              {EQUIPMENT_CATEGORY_SHORT_LABELS[category]}
            </p>
            <ul className="space-y-1.5">
              {items.map((item) => {
                const free = item.name.trim().toLowerCase() === 'dagger' && (item.cost ?? 0) === 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="font-body text-ink text-body-min">
                      {item.name}
                      {free ? <span className="text-ink-faded text-xs"> (free)</span> : null}
                    </span>
                    {!free && (
                      <span className="flex gap-1 shrink-0">
                        <Button size="dense" variant="secondary" fullWidth={false} onClick={() => onStash(item.id)}>
                          Stash
                        </Button>
                        <Button
                          size="dense"
                          variant="secondary"
                          fullWidth={false}
                          onClick={() => onSell(item.id, Math.floor((item.cost ?? 0) / 2))}
                        >
                          Sell ½ ({Math.floor((item.cost ?? 0) / 2)})
                        </Button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Plate>
        ))
      )}

      {/* Shop */}
      <Button variant="secondary" onClick={() => setShopOpen((o) => !o)}>
        {shopOpen ? 'Close shop' : 'Buy wargear'}
      </Button>
      {shopOpen && (
        <div className="space-y-3">
          {shopGrouped.length === 0 && (
            <p className="font-body text-ink-faded text-sm px-1">No equipment list for this unit.</p>
          )}
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
                      {item.restriction && (
                        <span className="block font-body text-ink-faded text-xs truncate">{item.restriction}</span>
                      )}
                    </span>
                    <Button size="dense" fullWidth={false} onClick={() => handleBuy(item)}>
                      {item.cost !== null ? `${item.cost} tn` : item.priceRange ?? 'var.'}
                    </Button>
                  </li>
                ))}
              </ul>
            </Plate>
          ))}
        </div>
      )}
    </div>
  );
}
