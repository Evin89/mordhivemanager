import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import Plate from '../components/Plate';
import { Button, TextField, Select } from '../components/ui';
import { strings } from '../strings';
import { warbandDefinitionsByName } from '../data/warbandRegistry';
import { createWarband } from '../lib/warbandFactory';
import { useWarbands } from '../store/warbands';

const { terms } = strings;

/**
 * Create a warband: name it, pick a type, muster it. Mirrors Mordheim Manager's
 * NewWarbandScreen flow, wired to the local store. (Quick-build starter rosters
 * are a follow-on; here you create empty and recruit on the roster.)
 */
export default function NewWarbandScreen() {
  const navigate = useNavigate();
  const { createWarband: addWarband } = useWarbands();
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState(warbandDefinitionsByName[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const definition = warbandDefinitionsByName.find((d) => d.id === typeId);

  function handleCreate() {
    if (!name.trim()) {
      setError('Give your warband a name.');
      return;
    }
    if (!definition) return;
    const warband = createWarband(definition, name.trim());
    addWarband(warband);
    navigate(`/warbands/${warband.id}`, { replace: true });
  }

  return (
    <div>
      <BackHeader title={`New ${terms.roster}`} to="/warbands" />
      <div className="px-1 py-6 space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="block font-display uppercase tracking-[0.06em] text-ink text-sm" htmlFor="wb-name">
            {terms.roster} name
          </label>
          <TextField
            id="wb-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. The Ash-Wardens"
          />
          {error && <p className="font-body text-ink text-sm">{error}</p>}
        </div>

        <div className="space-y-2">
          <label className="block font-display uppercase tracking-[0.06em] text-ink text-sm" htmlFor="wb-type">
            Warband type
          </label>
          <Select id="wb-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {warbandDefinitionsByName.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          {definition && (
            <Plate className="p-3">
              <p className="font-body text-ink text-sm">
                Starting {terms.currency}: <strong>{definition.startingGold ?? '?'} {terms.currencyAbbr}</strong> ·
                Min {definition.minWarbandSize ?? '?'} · Max {definition.maxWarbandSize ?? '?'} models
              </p>
              <p className="font-body text-ink-faded text-xs mt-1">{definition.source.split('.')[0]}.</p>
            </Plate>
          )}
        </div>

        <Button onClick={handleCreate}>Muster {terms.roster.toLowerCase()}</Button>
      </div>
    </div>
  );
}
