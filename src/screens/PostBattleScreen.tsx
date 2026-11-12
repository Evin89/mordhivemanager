import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
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
  upkeepDue,
} from '../lib/postBattle';
import { BattleResult } from '../types';
import ExplorationRoll from '../components/ExplorationRoll';
import { recordBattle } from '../lib/battles';
import { computeWarbandRating } from '../lib/rating';

const { terms } = strings;
const STEPS = ['Battle Info', 'Injuries', 'Experience', 'Advances', 'Income', 'Upkeep', 'Confirm'] as const;

const EXPLORATION_PREFIX = 'Exploration —';
/** Drops any prior auto-added exploration line so a re-roll replaces it. */
function stripLocationLine(notes: string): string {
  return notes
    .split('\n')
    .filter((l) => !l.startsWith(EXPLORATION_PREFIX))
    .join('\n')
    .trim();
}
function appendLine(notes: string, line: string): string {
  return notes ? `${notes}\n${line}` : line;
}

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
  const { saveWarband, warbands } = useWarbands();
  const [saving, setSaving] = useState(false);

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
  const patchHired = (id: string, p: Partial<PostBattleDraft['hired'][string]>) =>
    setDraft((d) => ({ ...d, hired: { ...d.hired, [id]: { ...d.hired[id], ...p } } }));

  function autoAwardXp() {
    setDraft((d) => {
      const heroes = { ...d.heroes };
      for (const h of warband!.heroes) {
        const base = 1 + (d.result === 'win' && h.isLeader ? 1 : 0);
        heroes[h.id] = { ...heroes[h.id], xpGained: base };
      }
      const henchmen = { ...d.henchmen };
      for (const g of warband!.henchmenGroups) henchmen[g.id] = { ...henchmen[g.id], xpGained: 1 };
      const hired = { ...d.hired };
      for (const id of Object.keys(hired)) hired[id] = { ...hired[id], xpGained: 1 };
      return { ...d, heroes, henchmen, hired };
    });
  }

  async function commit() {
    if (saving) return;
    setSaving(true);
    const before = warband!;
    const session = loadBattleSession(before.id);
    const next = applyDraft(before, draft);
    saveWarband(next);
    const err = await recordBattle({
      before,
      after: next,
      ratingAfter: computeWarbandRating(next),
      draft,
      session,
      myWarbands: warbands,
    });
    clearBattleSession(before.id);
    navigate(`/warbands/${before.id}`, { replace: true, state: err ? { notice: err } : undefined });
  }

  const heroList = warband.heroes.filter((h) => h.status === 'active' || h.status === 'missNextGame');
  const hiredList = warband.hiredSwords.filter((h) => draft.hired?.[h.id]);
  const due = upkeepDue(warband, draft);
  const treasuryAfterIncome = warband.gold + draft.goldFound;

  return (
    <div>
      <BackHeader title="Post-Battle" to={`/warbands/${warband.id}`} />
      <div className="py-6 space-y-6">
        <div className="dossier-band"><p className="italic text-brass-text">After {loadBattleSession(warband.id)?.scenario || 'the battle'}</p><h1>{STEPS[step]}</h1></div><div className="rail" />
        {/* Stepper */}
        <div className="stepper" role="group" aria-label="Post-battle progress">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              className={i < step ? 'done' : ''}
            >
              <span className="pip">{i + 1}</span>{s}
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
                        <Button size="dense" variant="secondary" fullWidth={false} onClick={() => {
                          const inj = rollInjury();
                          patchHero(h.id, { injury: inj, dies: inj.name === 'Dead' });
                        }}>
                          Roll D66
                        </Button>
                        {pb.injury && <div className="injury-result"><strong>{pb.injury.roll}</strong><span>{pb.injury.name}</span></div>}
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
            {hiredList.map((h) => {
              const pb = draft.hired[h.id];
              return (
                <Plate key={h.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{h.name} <span className="text-ink-faded text-xs">(Hired Gun)</span></span>
                    <label className="flex items-center gap-2 font-body text-ink text-sm">
                      <input type="checkbox" checked={pb.outOfAction} onChange={(e) => patchHired(h.id, { outOfAction: e.target.checked, lost: e.target.checked ? pb.lost : false })} />
                      Out of action
                    </label>
                  </div>
                  {pb.outOfAction && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="dense" variant="secondary" fullWidth={false} onClick={() => patchHired(h.id, { lost: rollHenchmanRemoval() })}>
                        Roll D6 (1-2 lost)
                      </Button>
                      <label className="flex items-center gap-1 font-body text-ink text-sm">
                        <input type="checkbox" checked={pb.lost} onChange={(e) => patchHired(h.id, { lost: e.target.checked })} /> Lost
                      </label>
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
            {hiredList.map((h) => {
              const pb = draft.hired[h.id];
              if (pb.lost) return (
                <Plate key={h.id} className="p-3"><span className="font-body text-ink-faded text-sm line-through">{h.name} — lost</span></Plate>
              );
              return (
                <Plate key={h.id} className="p-3 flex items-center justify-between gap-2">
                  <span className="font-body text-ink text-body-min">{h.name} <span className="text-ink-faded text-xs">({h.xp} → {h.xp + pb.xpGained} XP, as a Henchman)</span></span>
                  <span className="flex items-center gap-2"><span className="font-body text-ink-faded text-xs">+</span><NumField value={pb.xpGained} onChange={(n) => patchHired(h.id, { xpGained: n })} /></span>
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
                    <Button size="dense" variant="secondary" fullWidth={false} disabled={pb.advances.length >= earned} onClick={() => patchHero(h.id, { advances: [...pb.advances, rollHeroAdvance(h.stats)] })}>
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
                    <Button size="dense" variant="secondary" fullWidth={false} disabled={pb.advances.length >= earned} onClick={() => patchHench(g.id, { advances: [...pb.advances, rollHenchmenAdvance(g.stats)] })}>
                      Roll advance ({pb.advances.length}/{earned})
                    </Button>
                  </div>
                  {pb.advances.map((a, i) => (
                    <p key={i} className="font-body text-ink-faded text-xs">2D6={a.roll}: {a.stat ? `+1 ${a.stat} (whole group)` : a.ladsGotTalent ? "The Lad's Got Talent — promote one to a Hero" : a.text}</p>
                  ))}
                </Plate>
              );
            })}
            {hiredList.map((h) => {
              const pb = draft.hired[h.id];
              if (pb.lost) return null;
              // XP as a Henchman, advances on the Heroes table (v0.5 p.126).
              const earned = advancesEarned(h.xp, h.xp + pb.xpGained, false);
              if (earned === 0) return null;
              return (
                <Plate key={h.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{h.name}</span>
                    <Button size="dense" variant="secondary" fullWidth={false} disabled={pb.advances.length >= earned} onClick={() => patchHired(h.id, { advances: [...pb.advances, rollHeroAdvance(h.stats)] })}>
                      Roll advance ({pb.advances.length}/{earned})
                    </Button>
                  </div>
                  {pb.advances.map((a, i) => (
                    <p key={i} className="font-body text-ink-faded text-xs">2D6={a.roll}: {a.stat ? `+1 ${a.stat}` : a.skill ? 'New Skill (pick on his card)' : a.text}</p>
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

        {/* Step 5 — Income (Exploration) */}
        {step === 4 && (
          <section className="space-y-3">
            <BannerHeader>Exploration</BannerHeader>
            <p className="font-body text-ink-faded text-xs px-1">
              Roll the Exploration chart for {terms.salvageResource}. The shards from the total are filled in below
              automatically; add any thrones or note gear a location yields.
            </p>
            <Plate className="p-3">
              <ExplorationRoll
                survivingHeroes={heroList.filter((h) => !draft.heroes[h.id].outOfAction && !draft.heroes[h.id].dies).length}
                won={draft.result === 'win'}
                onResult={(shards, location) => {
                  const cleaned = stripLocationLine(draft.notes);
                  patch({
                    diamantineFound: shards,
                    notes: location
                      ? appendLine(cleaned, `${EXPLORATION_PREFIX} ${location.combination} ${location.name}: ${location.effect}`)
                      : cleaned,
                  });
                }}
              />
            </Plate>
            <Plate className="p-3 space-y-2">
              <label className="flex items-center justify-between gap-2">
                <span className="font-body text-ink text-body-min">{terms.salvageResource} shards found</span>
                <NumField value={draft.diamantineFound} onChange={(n) => patch({ diamantineFound: n })} />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="font-body text-ink text-body-min">{terms.currency} gained (loot sold, etc.)</span>
                <NumField value={draft.goldFound} onChange={(n) => patch({ goldFound: n })} />
              </label>
            </Plate>
          </section>
        )}

        {/* Step 6 — Upkeep (Hired Guns) */}
        {step === 5 && (
          <section className="space-y-3">
            <BannerHeader>Upkeep</BannerHeader>
            {hiredList.length === 0 ? (
              <p className="font-body text-ink-faded text-sm px-1">No Hired Guns — nothing to pay.</p>
            ) : (
              <>
                <p className="font-body text-ink-faded text-xs px-1">
                  After each battle he fights, including the first, pay a Hired Gun's upkeep to keep him. Unpaid, he leaves and his experience is lost.
                </p>
                {hiredList.map((h) => {
                  const pb = draft.hired[h.id];
                  if (pb.lost) return (
                    <Plate key={h.id} className="p-3"><span className="font-body text-ink-faded text-sm">{h.name} was lost — no upkeep.</span></Plate>
                  );
                  return (
                    <Plate key={h.id} className="p-3 flex items-center justify-between gap-2">
                      <span className="font-body text-ink text-body-min">{h.name} <span className="text-ink-faded text-xs">({h.upkeep} {terms.currencyAbbr})</span></span>
                      <label className="flex items-center gap-2 font-body text-ink text-sm">
                        <input type="checkbox" checked={pb.keep} onChange={(e) => patchHired(h.id, { keep: e.target.checked })} />
                        Pay and keep
                      </label>
                    </Plate>
                  );
                })}
                <p className={`font-body text-sm px-1 ${due > treasuryAfterIncome ? 'text-ink' : 'text-ink-faded'}`}>
                  Upkeep {due} {terms.currencyAbbr} · treasury after income {treasuryAfterIncome} {terms.currencyAbbr}
                  {due > treasuryAfterIncome && ' — not enough: let someone go.'}
                </p>
              </>
            )}
          </section>
        )}

        {/* Step 7 — Confirm */}
        {step === 6 && (
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
              {hiredList.length > 0 && (
                <p>
                  Hired Guns: upkeep −{due} {terms.currencyAbbr}
                  {hiredList.some((h) => draft.hired[h.id].lost) && ` · lost: ${hiredList.filter((h) => draft.hired[h.id].lost).map((h) => h.name).join(', ')}`}
                  {hiredList.some((h) => !draft.hired[h.id].lost && !draft.hired[h.id].keep) && ` · leaving: ${hiredList.filter((h) => !draft.hired[h.id].lost && !draft.hired[h.id].keep).map((h) => h.name).join(', ')}`}
                </p>
              )}
            </Plate>
            <p className="font-body text-ink-faded text-xs px-1">Applying commits these changes to the warband, adds the battle to its history (and to its campaign's log, if it's in one) and ends the battle.</p>
            <Button onClick={commit} disabled={saving}>{saving ? 'Saving…' : 'Apply & finish'}</Button>
          </section>
        )}

        {/* Nav */}
        <div className="grid grid-cols-[1fr_2fr] gap-3 pt-2">
          <Button variant="secondary" fullWidth={false} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
          {step < STEPS.length - 1 && (
            <Button fullWidth={false} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
