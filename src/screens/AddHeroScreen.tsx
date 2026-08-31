import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import { Button, TextField, Select } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { getWarbandDefinition } from '../data/warbandRegistry';
import { createHeroFromSlot } from '../lib/warbandFactory';
import { remainingHeroSlots, remainingWarbandCapacity } from '../lib/warbandLimits';

const { terms } = strings;

/** Recruit a Hero onto a warband. Mirrors MM's AddHeroScreen; rulebook limits
 * confirm rather than refuse, since groups do bend them by agreement. */
export default function AddHeroScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const navigate = useNavigate();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();
  const definition = warband ? getWarbandDefinition(warband.warbandType) : undefined;
  const [slotId, setSlotId] = useState(definition?.heroSlots[0]?.id ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!warband) return <Navigate to="/warbands" replace />;
  if (!definition) return <Navigate to={`/warbands/${warband.id}`} replace />;

  const slot = definition.heroSlots.find((s) => s.id === slotId);
  const cost = slot?.cost ?? 0;
  const capacity = remainingWarbandCapacity(warband, definition);
  const slotsLeft = slot ? remainingHeroSlots(warband, slot) : null;
  const canAfford = cost <= warband.gold;

  function handleAdd() {
    if (!name.trim()) {
      setError('Give the hero a name.');
      return;
    }
    if (!slot || !warband || !definition) return;

    if (slotsLeft === 0 && slot.maxCount !== null) {
      if (!window.confirm(`You already have the maximum ${slot.maxCount} ${slot.unitType}. Recruit anyway?`)) return;
    }
    if (capacity === 0 && definition.maxWarbandSize !== null) {
      if (!window.confirm(`This warband is at its maximum of ${definition.maxWarbandSize} models. Recruit anyway?`)) return;
    }
    if (!canAfford) {
      if (!window.confirm(`This costs ${cost} ${terms.currencyAbbr} but you only have ${warband.gold}. Recruit anyway (goes into debt)?`)) return;
    }

    const hero = createHeroFromSlot(slot, name.trim());
    saveWarband({ ...warband, gold: warband.gold - cost, heroes: [...warband.heroes, hero] });
    navigate(`/warbands/${warband.id}`, { replace: true });
  }

  return (
    <div>
      <BackHeader title={`Recruit ${terms.hero}`} to={`/warbands/${warband.id}`} />
      <div className="px-1 py-6 space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="block font-display uppercase tracking-[0.06em] text-ink text-sm" htmlFor="hero-slot">
            Unit type
          </label>
          <Select id="hero-slot" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            {definition.heroSlots.map((s) => {
              const left = remainingHeroSlots(warband, s);
              return (
                <option key={s.id} value={s.id} disabled={left === 0}>
                  {s.unitType} ({s.cost ?? '?'} {terms.currencyAbbr}){left === 0 ? ' — full' : ''}
                </option>
              );
            })}
          </Select>
          {slot && (
            <p className="font-body text-ink-faded text-sm">
              {slotsLeft === null ? 'Unlimited' : `${slotsLeft} of ${slot.maxCount} left`} · starts with{' '}
              {slot.startingXp ?? 0} XP
            </p>
          )}
          <p className={`font-body text-sm ${canAfford ? 'text-ink-faded' : 'text-ink'}`}>
            Cost {cost} {terms.currencyAbbr} · treasury {warband.gold} {terms.currencyAbbr}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block font-display uppercase tracking-[0.06em] text-ink text-sm" htmlFor="hero-name">
            Name
          </label>
          <TextField
            id="hero-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Sergeant Vael"
          />
          {error && <p className="font-body text-ink text-sm">{error}</p>}
        </div>

        <Button onClick={handleAdd}>Recruit</Button>
      </div>
    </div>
  );
}
