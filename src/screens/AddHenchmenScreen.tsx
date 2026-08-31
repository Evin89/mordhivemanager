import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import { Button, TextField, Select, NumberInput } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { getWarbandDefinition } from '../data/warbandRegistry';
import { createHenchmenGroupFromType } from '../lib/warbandFactory';
import {
  maxAffordableHenchmen,
  remainingHenchmenSlots,
  remainingWarbandCapacity,
} from '../lib/warbandLimits';

const { terms } = strings;

/** Recruit a Henchmen group (bought in groups of 1-5). Mirrors MM's flow. */
export default function AddHenchmenScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const navigate = useNavigate();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();
  const definition = warband ? getWarbandDefinition(warband.warbandType) : undefined;
  const [typeId, setTypeId] = useState(definition?.henchmenTypes[0]?.id ?? '');
  const [groupName, setGroupName] = useState('');
  const [count, setCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  if (!warband) return <Navigate to="/warbands" replace />;
  if (!definition) return <Navigate to={`/warbands/${warband.id}`} replace />;

  const type = definition.henchmenTypes.find((t) => t.id === typeId);
  const slotsLeft = type ? remainingHenchmenSlots(warband, type) : null;
  const totalCost = (type?.cost ?? 0) * count;
  const affordable = type ? maxAffordableHenchmen(warband, definition, type) : 0;

  function handleAdd() {
    if (!type || !warband || !definition) return;
    if (!groupName.trim()) {
      setError('Give the new group a name.');
      return;
    }
    const perType = remainingHenchmenSlots(warband, type);
    if (perType !== null && count > perType && type.maxCount !== null) {
      if (!window.confirm(`Only ${perType} more ${type.unitType} allowed. Add anyway?`)) return;
    }
    const capacity = remainingWarbandCapacity(warband, definition);
    if (capacity !== null && count > capacity && definition.maxWarbandSize !== null) {
      if (!window.confirm(`This exceeds the max of ${definition.maxWarbandSize} models. Add anyway?`)) return;
    }
    if (totalCost > warband.gold) {
      if (!window.confirm(`This costs ${totalCost} ${terms.currencyAbbr} but you have ${warband.gold}. Add anyway?`)) return;
    }

    const group = createHenchmenGroupFromType(type, groupName.trim(), count);
    saveWarband({
      ...warband,
      gold: warband.gold - totalCost,
      henchmenGroups: [...warband.henchmenGroups, group],
    });
    navigate(`/warbands/${warband.id}`, { replace: true });
  }

  return (
    <div>
      <BackHeader title={`Recruit ${terms.henchmanPlural}`} to={`/warbands/${warband.id}`} />
      <div className="px-1 py-6 space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="block font-display uppercase tracking-[0.06em] text-ink text-sm" htmlFor="h-type">
            Unit type
          </label>
          <Select
            id="h-type"
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setError(null);
            }}
          >
            {definition.henchmenTypes.map((t) => {
              const left = remainingHenchmenSlots(warband, t);
              return (
                <option key={t.id} value={t.id} disabled={left === 0}>
                  {t.unitType} ({t.cost ?? '?'} {terms.currencyAbbr}){left === 0 ? ' — full' : ''}
                </option>
              );
            })}
          </Select>
          {type && (
            <p className="font-body text-ink-faded text-sm">
              {slotsLeft === null ? 'Unlimited' : `${slotsLeft} of ${type.maxCount} left`}
            </p>
          )}
          <p className={`font-body text-sm ${totalCost <= warband.gold ? 'text-ink-faded' : 'text-ink'}`}>
            Cost {totalCost} {terms.currencyAbbr} · treasury {warband.gold} {terms.currencyAbbr}
          </p>
          {affordable === 0 && <p className="font-body text-ink text-sm">Can't recruit more right now.</p>}
        </div>

        <div className="space-y-2">
          <label className="block font-display uppercase tracking-[0.06em] text-ink text-sm" htmlFor="grp-name">
            Group name
          </label>
          <TextField
            id="grp-name"
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Vael's Squad"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-display uppercase tracking-[0.06em] text-ink text-sm" htmlFor="grp-count">
            How many (1-5)
          </label>
          <NumberInput id="grp-count" min={1} value={count} onChange={setCount} />
        </div>

        {error && <p className="font-body text-ink text-sm">{error}</p>}

        <Button onClick={handleAdd}>Recruit group</Button>
      </div>
    </div>
  );
}
