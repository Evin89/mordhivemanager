import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button, Select } from '../components/ui';
import { strings } from '../strings';
import { useWarbands, useWarbandLookup } from '../store/warbands';
import { clearBattleSession, loadBattleSession } from '../store/battle';
import {
  PostBattleDraft,
  createDraft,
  applyDraft,
  rollInjury,
  rollHenchmanRemoval,
  rollHeroAdvance,
  rollHenchmenAdvance,
  advancesEarned,
} from '../lib/postBattle';
import { BattleResult } from '../types';

const { terms } = strings;
const STEPS = ['Battle Info', 'Injuries', 'Experience', 'Advances', 'Income', 'Confirm'] as const;

function NumField({ value, onChange, min = 0 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Math.max(min, parseInt(e.target.value, 10) || 0))}
      className="w-20 min-h-[44px] bg-plate border-2 border-steel px-2 text-ink tabular-nums text-center focus:outline-none focus:border-banner"
    />
  );
}

/** The guided post-battle sequence (spec §5), consuming the battle tracker's
 * casualty tally and applying injuries, experience, advances and income to the
 * warband in one commit. A staged draft; nothing changes until Confirm. */
export default function PostBattleScreen() {
  const { warbandId } = useParams<{ warbandId: string }>();
  const navigate = useNavigate();
  const warband = useWarbandLookup(warbandId);
  const { saveWarband } = useWarbands();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PostBattleDraft>(() =>
    createDraft(warband!, warband ? loadBattleSession(warband.id) : undefined),
  );

  if (!warband) return <Navigate to="/warbands" replace />;

  const patch = (p: Partial<PostBattleDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchHero = (id: string, p: Partial<PostBattleDraft['heroes'][string]>) =>
    setDraft((d) => ({ ...d, heroes: { ...d.heroes, [id]: { ...d.heroes[id], ...p } } }));
  const patchHench = (id: string, p: Partial<PostBattleDraft['henchmen'][string]>) =>
    setDraft((d) => ({ ...d, henchmen: { ...d.henchmen, [id]: { ...d.henchmen[id], ...p } } }));

  function autoAwardXp() {
    setDraft((d) => {
      const heroes = { ...d.heroes };
      for (const h of warband!.heroes) {
        const base = 1 + (d.result === 'win' && h.isLeader ? 1 : 0);
        heroes[h.id] = { ...heroes[h.id], xpGained: base };
      }
      const henchmen = { ...d.henchmen };
      for (const g of warband!.henchmenGroups) henchmen[g.id] = { ...henchmen[g.id], xpGained: 1 };
      return { ...d, heroes, henchmen };
    });
  }

  function commit() {
    const next = applyDraft(warband!, draft);
    saveWarband(next);
    clearBattleSession(warband!.id);
    navigate(`/warbands/${warband!.id}`, { replace: true });
  }

  const heroList = warband.heroes.filter((h) => h.status === 'active' || h.status === 'missNextGame');

  return (
    <div>
      <BackHeader title="Post-Battle" to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        {/* Stepper */}
        <div className="flex flex-wrap gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`font-display uppercase tracking-[0.04em] text-xs px-2 py-1 min-h-[36px] border ${
                i === step ? 'bg-banner text-on-banner border-banner' : 'bg-plate text-ink-faded border-steel'
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {/* Step 1 — Battle Info */}
        {step === 0 && (
          <section className="space-y-3">
            <BannerHeader>Battle Info</BannerHeader>
            <Plate className="p-4 space-y-3">
              <label className="block">
                <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Result</span>
                <Select value={draft.result} onChange={(e) => patch({ result: e.target.value as BattleResult })}>
                  <option value="win">Win</option>
                  <option value="draw">Draw</option>
                  <option value="loss">Loss</option>
                </Select>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="font-body text-ink text-body-min">Enemies taken out of action (your heroes)</span>
                <NumField value={draft.enemiesTakenOut} onChange={(n) => patch({ enemiesTakenOut: n })} />
              </label>
              <p className="font-body text-ink-faded text-xs">
                Any Hero earns +1 Experience per enemy he personally took out — add those in the Experience step.
              </p>
            </Plate>
          </section>
        )}

        {/* Step 2 — Injuries */}
        {step === 1 && (
          <section className="space-y-3">
            <BannerHeader>Injuries</BannerHeader>
            <p className="font-body text-ink-faded text-xs px-1">
              Heroes out of action roll on the D66 Serious Injury chart; henchmen out of action are removed on a D6 of 1-2.
            </p>
            {heroList.map((h) => {
              const pb = draft.heroes[h.id];
              return (
                <Plate key={h.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{h.name}</span>
                    <label className="flex items-center gap-2 font-body text-ink text-sm">
                      <input
                        type="checkbox"
                        checked={pb.outOfAction}
                        onChange={(e) => patchHero(h.id, { outOfAction: e.target.checked })}
                      />
                      Out of action
                    </label>
                  </div>
                  {pb.outOfAction && (
                    <>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Button size="dense" fullWidth={false} onClick={() => {
                          const inj = rollInjury();
                          patchHero(h.id, { injury: inj, dies: inj.name === 'Dead' });
                        }}>
                          Roll D66
                        </Button>
                        {pb.injury && <PageChip>{pb.injury.roll} · {pb.injury.name}</PageChip>}
                        {pb.injury && (
                          <label className="flex items-center gap-1 font-body text-ink text-sm">
                            <input type="checkbox" checked={pb.dies} onChange={(e) => patchHero(h.id, { dies: e.target.checked })} /> Dies
                          </label>
                        )}
                      </div>
                      {pb.injury && <p className="font-body text-ink-faded text-xs">{pb.injury.effect}</p>}
                    </>
                  )}
                </Plate>
              );
            })}
            {warband.henchmenGroups.map((g) => {
              const pb = draft.henchmen[g.id];
              return (
                <Plate key={g.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{g.groupName} <span className="text-ink-faded text-xs">({g.count})</span></span>
                    <span className="flex items-center gap-2 font-body text-ink text-sm">
                      Out of action <NumField value={pb.outOfActionCount} onChange={(n) => patchHench(g.id, { outOfActionCount: Math.min(g.count, n) })} />
                    </span>
                  </div>
                  {pb.outOfActionCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Button size="dense" variant="secondary" fullWidth={false} onClick={() => {
                        let died = 0;
                        for (let i = 0; i < pb.outOfActionCount; i++) if (rollHenchmanRemoval()) died += 1;
                        patchHench(g.id, { diedCount: died });
                      }}>
                        Roll removals
                      </Button>
                      <span className="font-body text-ink text-sm">Removed: <NumField value={pb.diedCount} onChange={(n) => patchHench(g.id, { diedCount: Math.min(g.count, n) })} /></span>
                    </div>
                  )}
                </Plate>
              );
            })}
          </section>
        )}

        {/* Step 3 — Experience */}
        {step === 2 && (
          <section className="space-y-3">
            <BannerHeader>Experience</BannerHeader>
            <Button size="dense" variant="secondary" fullWidth={false} onClick={autoAwardXp}>
              Auto-award standard XP (+1 survives, +1 winning leader)
            </Button>
            {heroList.map((h) => {
              const pb = draft.heroes[h.id];
              if (pb.dies) return (
                <Plate key={h.id} className="p-3"><span className="font-body text-ink-faded text-sm line-through">{h.name} — slain</span></Plate>
              );
              return (
                <Plate key={h.id} className="p-3 flex items-center justify-between gap-2">
                  <span className="font-body text-ink text-body-min">{h.name} <span className="text-ink-faded text-xs">({h.xp} → {h.xp + pb.xpGained} XP)</span></span>
                  <span className="flex items-center gap-2"><span className="font-body text-ink-faded text-xs">+</span><NumField value={pb.xpGained} onChange={(n) => patchHero(h.id, { xpGained: n })} /></span>
                </Plate>
              );
            })}
            {warband.henchmenGroups.map((g) => {
              const pb = draft.henchmen[g.id];
              return (
                <Plate key={g.id} className="p-3 flex items-center justify-between gap-2">
                  <span className="font-body text-ink text-body-min">{g.groupName} <span className="text-ink-faded text-xs">({g.xp} → {g.xp + pb.xpGained} XP each)</span></span>
                  <span className="flex items-center gap-2"><span className="font-body text-ink-faded text-xs">+</span><NumField value={pb.xpGained} onChange={(n) => patchHench(g.id, { xpGained: n })} /></span>
                </Plate>
              );
            })}
          </section>
        )}

        {/* Step 4 — Advances */}
        {step === 3 && (
          <section className="space-y-3">
            <BannerHeader>Advances</BannerHeader>
            <p className="font-body text-ink-faded text-xs px-1">
              A model rolls an advance each time its XP crosses a threshold box. Characteristic increases apply automatically; a "New Skill" is picked later on the model's card.
            </p>
            {heroList.map((h) => {
              const pb = draft.heroes[h.id];
              if (pb.dies) return null;
              const earned = advancesEarned(h.xp, h.xp + pb.xpGained, true);
              if (earned === 0) return null;
              return (
                <Plate key={h.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{h.name}</span>
                    <Button size="dense" fullWidth={false} disabled={pb.advances.length >= earned} onClick={() => patchHero(h.id, { advances: [...pb.advances, rollHeroAdvance(h.stats)] })}>
                      Roll advance ({pb.advances.length}/{earned})
                    </Button>
                  </div>
                  {pb.advances.map((a, i) => (
                    <p key={i} className="font-body text-ink-faded text-xs">2D6={a.roll}: {a.stat ? `+1 ${a.stat}` : a.skill ? 'New Skill (pick on the card)' : a.text}</p>
                  ))}
                </Plate>
              );
            })}
            {warband.henchmenGroups.map((g) => {
              const pb = draft.henchmen[g.id];
              const earned = advancesEarned(g.xp, g.xp + pb.xpGained, false);
              if (earned === 0) return null;
              return (
                <Plate key={g.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{g.groupName}</span>
                    <Button size="dense" fullWidth={false} disabled={pb.advances.length >= earned} onClick={() => patchHench(g.id, { advances: [...pb.advances, rollHenchmenAdvance(g.stats)] })}>
                      Roll advance ({pb.advances.length}/{earned})
                    </Button>
                  </div>
                  {pb.advances.map((a, i) => (
                    <p key={i} className="font-body text-ink-faded text-xs">2D6={a.roll}: {a.stat ? `+1 ${a.stat} (whole group)` : a.ladsGotTalent ? "The Lad's Got Talent — promote one to a Hero" : a.text}</p>
                  ))}
                </Plate>
              );
            })}
            {heroList.every((h) => advancesEarned(h.xp, h.xp + draft.heroes[h.id].xpGained, true) === 0) &&
              warband.henchmenGroups.every((g) => advancesEarned(g.xp, g.xp + draft.henchmen[g.id].xpGained, false) === 0) && (
                <p className="font-body text-ink-faded text-sm px-1">No advances earned this battle.</p>
              )}
          </section>
        )}

        {/* Step 5 — Income */}
        {step === 4 && (
          <section className="space-y-3">
            <BannerHeader>Income</BannerHeader>
            <p className="font-body text-ink-faded text-xs px-1">
              Enter the {terms.salvageResource} shards found and any thrones gained (from selling shards or exploration). The full Exploration chart is a later addition — for now record the totals.
            </p>
            <Plate className="p-3 space-y-2">
              <label className="flex items-center justify-between gap-2">
                <span className="font-body text-ink text-body-min">{terms.salvageResource} shards found</span>
                <NumField value={draft.diamantineFound} onChange={(n) => patch({ diamantineFound: n })} />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="font-body text-ink text-body-min">{terms.currency} gained</span>
                <NumField value={draft.goldFound} onChange={(n) => patch({ goldFound: n })} />
              </label>
            </Plate>
          </section>
        )}

        {/* Step 6 — Confirm */}
        {step === 5 && (
          <section className="space-y-3">
            <BannerHeader>Confirm</BannerHeader>
            <Plate className="p-4 space-y-2 font-body text-ink text-body-min">
              <p>Result: <strong>{draft.result}</strong></p>
              <p>Heroes slain: {heroList.filter((h) => draft.heroes[h.id].dies).map((h) => h.name).join(', ') || 'none'}</p>
              <p>Injuries: {heroList.filter((h) => draft.heroes[h.id].injury && !draft.heroes[h.id].dies).map((h) => `${h.name} (${draft.heroes[h.id].injury!.name})`).join(', ') || 'none'}</p>
              <p>XP awarded: {heroList.reduce((s, h) => s + (draft.heroes[h.id].dies ? 0 : draft.heroes[h.id].xpGained), 0)} to heroes, {warband.henchmenGroups.reduce((s, g) => s + draft.henchmen[g.id].xpGained, 0)} to henchmen groups</p>
              <p>Advances: {heroList.reduce((s, h) => s + draft.heroes[h.id].advances.length, 0) + warband.henchmenGroups.reduce((s, g) => s + draft.henchmen[g.id].advances.length, 0)} rolled</p>
              <p>Henchmen removed: {warband.henchmenGroups.reduce((s, g) => s + draft.henchmen[g.id].diedCount, 0)}</p>
              <p>Income: +{draft.diamantineFound} {terms.salvageResource}, +{draft.goldFound} {terms.currencyAbbr}</p>
            </Plate>
            <p className="font-body text-ink-faded text-xs px-1">Applying commits these changes to the warband and ends the battle.</p>
            <Button onClick={commit}>Apply &amp; finish</Button>
          </section>
        )}

        {/* Nav */}
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="secondary" fullWidth={false} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
          {step < STEPS.length - 1 && (
            <Button fullWidth={false} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
