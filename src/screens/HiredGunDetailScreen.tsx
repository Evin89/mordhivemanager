import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import ProfileBlock from '../components/ProfileBlock';
import SkillManager from '../components/SkillManager';
import DesignerNote from '../components/DesignerNote';
import { Button, TextField } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { getHiredGunDefinition } from '../lib/hiredGuns';
import { HiredSword, ModelStatus, StatLine } from '../types';

const { terms } = strings;

const STATUS_LABELS: Record<ModelStatus, string> = {
  active: 'Active',
  missNextGame: 'Misses next game',
  dead: 'Dead',
  captured: 'Captured',
  left: 'Left the warband',
};

/**
 * One Hired Gun: name, profile, XP, skills and powers, and letting him go.
 * Deliberately no wargear shop — the book: "A player cannot buy extra weapons or
 * equipment for a Hired Gun, and he cannot sell the Hired Gun's weapons or
 * equipment."
 */
export default function HiredGunDetailScreen() {
  const { warbandId, hiredId } = useParams<{ warbandId: string; hiredId: string }>();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();
  const navigate = useNavigate();

  if (!warband) return <Navigate to="/warbands" replace />;
  const gun = warband.hiredSwords.find((h) => h.id === hiredId);
  if (!gun) return <Navigate to={`/warbands/${warband.id}`} replace />;
  const def = getHiredGunDefinition(gun.definitionId ?? gun.type);

  function patch(mutate: (h: HiredSword) => HiredSword) {
    if (!warband) return;
    saveWarband({ ...warband, hiredSwords: warband.hiredSwords.map((h) => (h.id === gun!.id ? mutate(h) : h)) });
  }

  return (
    <div>
      <BackHeader title={gun.name} to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        <Plate className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <PageChip>{gun.type}</PageChip>
            <PageChip>{gun.xp} XP</PageChip>
            <PageChip>Upkeep {gun.upkeep} {terms.currencyAbbr}</PageChip>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Name</span>
              <TextField value={gun.name} onChange={(e) => patch((h) => ({ ...h, name: e.target.value }))} />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Experience</span>
              <input
                type="number"
                min={0}
                value={gun.xp}
                onChange={(e) => patch((h) => ({ ...h, xp: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                className="w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink tabular-nums focus:outline-none focus:border-banner"
              />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Status</span>
              <select
                value={gun.status}
                onChange={(e) => patch((h) => ({ ...h, status: e.target.value as ModelStatus }))}
                className="w-full min-h-[48px] bg-plate border-2 border-steel px-3 text-ink focus:outline-none focus:border-banner"
              >
                {(Object.keys(STATUS_LABELS) as ModelStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
        </Plate>

        <section className="space-y-3">
          <BannerHeader>Profile</BannerHeader>
          <Plate className="p-4">
            <ProfileBlock
              stats={gun.stats}
              maximums={gun.statMaximums}
              showMaximums={false}
              onStatChange={(key: keyof StatLine, val) => patch((h) => ({ ...h, stats: { ...h.stats, [key]: val } }))}
            />
            <p className="mt-2 font-body text-ink-faded text-xs">
              Hired Guns roll on the Heroes Advancement table. Edit a value to record an advance.
            </p>
          </Plate>
        </section>

        <section className="space-y-3">
          <BannerHeader>Skills</BannerHeader>
          <SkillManager
            skillLists={gun.skillLists}
            spellLists={gun.spellLists}
            knownSkills={gun.skills}
            isLeader={false}
            warbandType={warband.warbandType}
            onAdd={(name) => patch((h) => ({ ...h, skills: [...h.skills, name] }))}
            onRemove={(name) => patch((h) => ({ ...h, skills: h.skills.filter((s) => s !== name) }))}
          />
          {gun.spells.length > 0 && (
            <Plate className="p-3">
              <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs mb-1">Powers</p>
              <div className="flex flex-wrap gap-2">{gun.spells.map((s) => <PageChip key={s}>{s}</PageChip>)}</div>
            </Plate>
          )}
        </section>

        <section className="space-y-3">
          <BannerHeader>Wargear</BannerHeader>
          <Plate className="p-3">
            <p className="font-body text-ink text-body-min">{gun.equipment.map((i) => i.name).join(', ') || '—'}</p>
            <p className="font-body text-ink-faded text-xs mt-1">Fixed by his entry: Hired Guns can't buy or sell equipment.</p>
          </Plate>
        </section>

        {def && (
          <DesignerNote title={`${def.name} — special rules (${def.source.replace('Mord Hive v0.5 ', '')})`}>
            <span className="block space-y-2">
              {def.specialRules.split(' | ').map((r, i) => (
                <span key={i} className="block">{r}</span>
              ))}
            </span>
          </DesignerNote>
        )}

        <section className="space-y-3">
          <BannerHeader>Notes</BannerHeader>
          <Plate className="p-2">
            <textarea
              value={gun.notes}
              onChange={(e) => patch((h) => ({ ...h, notes: e.target.value }))}
              rows={3}
              className="w-full bg-plate px-3 py-2 text-ink font-body focus:outline-none resize-y"
              placeholder="Injuries, story…"
            />
          </Plate>
        </section>

        <div className="pt-2 flex flex-wrap gap-2">
          {gun.status !== 'left' && gun.status !== 'dead' && (
            <Button
              variant="secondary"
              fullWidth={false}
              onClick={() => {
                if (window.confirm(`Let ${gun.name} go? He leaves the warband and his experience is lost.`)) {
                  patch((h) => ({ ...h, status: 'left' }));
                  navigate(`/warbands/${warband.id}`, { replace: true });
                }
              }}
            >
              Let him go
            </Button>
          )}
          <Button
            variant="danger"
            fullWidth={false}
            onClick={() => {
              if (window.confirm(`Remove ${gun.name} from the roster entirely?`)) {
                saveWarband({ ...warband, hiredSwords: warband.hiredSwords.filter((h) => h.id !== gun.id) });
                navigate(`/warbands/${warband.id}`, { replace: true });
              }
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
