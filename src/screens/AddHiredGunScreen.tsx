import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import DesignerNote from '../components/DesignerNote';
import { Button, Select, TextField } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import spellsData from '../data/spells.json';
import {
  createHiredGun,
  getStartingEquipment,
  hiredGunAvailability,
  hiredGunDefinitions,
  hiredGunRules,
  upkeepFor,
} from '../lib/hiredGuns';
import { StatLine } from '../types';

const { terms } = strings;
const STATS: (keyof StatLine)[] = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Ld'];
const label = 'block font-display uppercase tracking-[0.06em] text-ink text-sm mb-1';

type SpellList = { name: string; spells: { roll: number; name: string; difficulty: number }[] };
const spellLists = (spellsData as unknown as { lists: Record<string, SpellList> }).lists;

/** Two different powers rolled on a D6 list (the book: re-roll a power he already knows). */
function rollPowers(listId: string, n: number): string[] {
  const list = spellLists[listId];
  if (!list) return [];
  const picked: string[] = [];
  let guard = 0;
  while (picked.length < Math.min(n, list.spells.length) && guard++ < 100) {
    const roll = 1 + Math.floor(Math.random() * 6);
    const spell = list.spells.find((s) => s.roll === roll);
    if (spell && !picked.includes(spell.name)) picked.push(spell.name);
  }
  return picked;
}

/**
 * Hire a Hired Gun (Mord Hive v0.5, pp.127-130). The entry's own text is shown
 * in full; the app enforces only what the book states outright — one of each
 * type, and the hiring bans some warbands name.
 */
export default function AddHiredGunScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const navigate = useNavigate();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();

  const hiredTypes = useMemo(
    () =>
      new Set(
        (warband?.hiredSwords ?? [])
          .filter((h) => h.status !== 'dead' && h.status !== 'left')
          .map((h) => h.definitionId ?? h.type),
      ),
    [warband],
  );
  const firstAllowed =
    hiredGunDefinitions.find(
      (d) => warband && hiredGunAvailability(d, warband.warbandType, hiredTypes.has(d.id) || hiredTypes.has(d.name)).allowed,
    ) ?? hiredGunDefinitions[0];

  const [defId, setDefId] = useState(firstAllowed.id);
  const [name, setName] = useState('');
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [powers, setPowers] = useState<string[]>([]);

  if (!warband) return <Navigate to="/warbands" replace />;

  const def = hiredGunDefinitions.find((d) => d.id === defId) ?? firstAllowed;
  const availability = hiredGunAvailability(def, warband.warbandType, hiredTypes.has(def.id) || hiredTypes.has(def.name));
  const gear = getStartingEquipment(def.id);
  const upkeep = upkeepFor(def, warband.warbandType);
  const needsPowers = (def.spellLists?.length ?? 0) > 0 && (def.startingSpells ?? 0) > 0;

  function hire() {
    if (!warband || !availability.allowed) return;
    if (def.hireFee > warband.gold) {
      if (!window.confirm(`Hiring costs ${def.hireFee} ${terms.currencyAbbr} but you have ${warband.gold}. Hire anyway?`)) return;
    }
    const gun = createHiredGun(def, warband.warbandType, { name, choiceIndex, spells: powers });
    saveWarband({ ...warband, gold: warband.gold - def.hireFee, hiredSwords: [...warband.hiredSwords, gun] });
    navigate(`/warbands/${warband.id}`, { replace: true });
  }

  return (
    <div>
      <BackHeader title="Hire a Hired Gun" to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6 max-w-2xl">
        <div className="space-y-2" role="radiogroup" aria-label="Hired Gun">
          {hiredGunDefinitions.map((d) => {
            const a = hiredGunAvailability(d, warband.warbandType, hiredTypes.has(d.id) || hiredTypes.has(d.name));
            const selected = d.id === def.id;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setDefId(d.id);
                  setChoiceIndex(0);
                  setPowers([]);
                }}
                className={`w-full text-left border-2 px-4 py-3 min-h-[44px] ${
                  selected ? 'border-banner bg-plate' : 'border-steel bg-plate/60'
                } ${a.allowed ? '' : 'opacity-60'}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display uppercase tracking-[0.04em] text-ink">{d.name}</span>
                  <span className="font-display text-sm tabular-nums text-ink-faded">
                    {d.hireFee} {terms.currencyAbbr} + {upkeepFor(d, warband.warbandType)} upkeep
                  </span>
                </div>
                {!a.allowed && <p className="font-body text-ink-faded text-sm mt-1">{a.reason}</p>}
              </button>
            );
          })}
        </div>

        <section className="space-y-3">
          <BannerHeader trailing={<PageChip className="border-on-banner/40">{def.source.replace('Mord Hive v0.5 ', '')}</PageChip>}>
            {def.name}
          </BannerHeader>
          <Plate className="p-4 space-y-3">
            <table className="w-full table-fixed border-collapse text-center font-display tabular-nums text-sm">
              <thead>
                <tr>
                  {STATS.map((k) => (
                    <th key={k} className="border border-steel py-1 text-xs">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {STATS.map((k) => (
                    <td key={k} className="border border-steel py-1">{def.statLine[k] ?? '–'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="font-body text-ink text-body-min"><span className="font-display uppercase text-xs tracking-[0.06em] text-ink-faded mr-1">May be hired</span>{def.mayBeHiredBy}</p>
            <p className="font-body text-ink text-body-min"><span className="font-display uppercase text-xs tracking-[0.06em] text-ink-faded mr-1">Rating</span>{def.ratingBonus}</p>
            <p className="font-body text-ink text-body-min"><span className="font-display uppercase text-xs tracking-[0.06em] text-ink-faded mr-1">{terms.wargear}</span>{def.equipment}</p>
            <p className="font-body text-ink text-body-min"><span className="font-display uppercase text-xs tracking-[0.06em] text-ink-faded mr-1">Skills</span>{def.skillLists.join(', ')}</p>
            <div className="space-y-2">
              {def.specialRules.split(' | ').map((r, i) => (
                <p key={i} className="font-body text-ink-faded text-sm">{r}</p>
              ))}
            </div>
          </Plate>

          {availability.check && (
            <p className="font-body text-ink border-l-4 border-steel pl-3 text-sm">{availability.check}</p>
          )}

          {availability.allowed && (
            <Plate className="p-4 space-y-4">
              {gear?.choice && (
                <label className="block">
                  <span className={label}>Equipment</span>
                  <Select value={choiceIndex} onChange={(e) => setChoiceIndex(Number(e.target.value))}>
                    {gear.choice.map((c, i) => (
                      <option key={c.label} value={i}>{c.label}</option>
                    ))}
                  </Select>
                </label>
              )}
              {needsPowers && (
                <div>
                  <span className={label}>Powers ({def.startingSpells} at random)</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="dense" variant="secondary" fullWidth={false} onClick={() => setPowers(rollPowers(def.spellLists![0], def.startingSpells!))}>
                      {powers.length ? 'Re-roll' : 'Roll powers'}
                    </Button>
                    {powers.map((p) => <PageChip key={p}>{p}</PageChip>)}
                  </div>
                </div>
              )}
              <label className="block">
                <span className={label}>Name</span>
                <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder={def.name} maxLength={60} />
              </label>
              <p className={`font-body text-sm ${def.hireFee <= warband.gold ? 'text-ink-faded' : 'text-ink'}`}>
                Hire fee {def.hireFee} {terms.currencyAbbr} · treasury {warband.gold} {terms.currencyAbbr} · then {upkeep} {terms.currencyAbbr} after every battle
              </p>
              <Button onClick={hire} disabled={needsPowers && powers.length === 0}>
                Hire {def.name}
              </Button>
            </Plate>
          )}
        </section>

        <DesignerNote title="Hired Guns">{`${hiredGunRules.recruiting} ${hiredGunRules.hireFee}`}</DesignerNote>
      </div>
    </div>
  );
}
