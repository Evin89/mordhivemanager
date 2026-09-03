import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import DesignerNote from '../components/DesignerNote';
import { Button, TextField } from '../components/ui';
import { useWarbands } from '../store/warbands';
import { useSoloCampaigns, SoloResult, SoloChapterEntry } from '../store/soloCampaign';
import { ACTS, actLabel, budgetForAct } from '../lib/soloAgenda';
import { difficultyForBudget } from '../lib/npc';

const RESULT_LABELS: Record<SoloResult, string> = { win: 'Victory', loss: 'Defeat', draw: 'Draw' };

/** One solo campaign: its arc across three acts, the recurring nemesis, the log
 * of games, and the hidden agenda revealed at the end. Playing a chapter launches
 * pre-battle wired to the nemesis; results are recorded here and advance the arc. */
export default function SoloCampaignScreen() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { getCampaign, saveCampaign, deleteCampaign } = useSoloCampaigns();
  const { warbands } = useWarbands();

  const campaign = getCampaign(campaignId);
  const [result, setResult] = useState<SoloResult>('win');
  const [scenario, setScenario] = useState('');
  const [notes, setNotes] = useState('');

  if (!campaign) return <Navigate to="/solo" replace />;
  const warband = warbands.find((w) => w.id === campaign.warbandId);

  const totalChapters = ACTS * campaign.chaptersPerAct;
  const complete = campaign.chapter > totalChapters;
  const wins = campaign.log.filter((e) => e.result === 'win').length;
  const losses = campaign.log.filter((e) => e.result === 'loss').length;
  const draws = campaign.log.filter((e) => e.result === 'draw').length;
  const budget = budgetForAct(campaign.act);

  function playChapter() {
    if (!warband) return;
    navigate(`/warbands/${warband.id}/pre-battle?campaign=${campaign!.id}`);
  }

  function recordResult() {
    const entry: SoloChapterEntry = {
      chapter: campaign!.chapter,
      act: campaign!.act,
      scenario: scenario.trim(),
      opponentName: campaign!.nemesisName,
      result,
      notes: notes.trim(),
      date: new Date().toISOString(),
    };
    const nextChapter = campaign!.chapter + 1;
    const nextAct = Math.min(ACTS, Math.ceil(nextChapter / campaign!.chaptersPerAct));
    saveCampaign({ ...campaign!, log: [...campaign!.log, entry], chapter: nextChapter, act: nextAct });
    setScenario('');
    setNotes('');
    setResult('win');
  }

  return (
    <div>
      <BackHeader title={campaign.name} to="/solo" />
      <div className="py-6 space-y-6">
        {/* Overview */}
        <Plate className="p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PageChip>{complete ? 'Finale' : actLabel(campaign.act)}</PageChip>
            <PageChip>Chapter {Math.min(campaign.chapter, totalChapters)} / {totalChapters}</PageChip>
            <PageChip>{wins}W · {losses}L · {draws}D</PageChip>
          </div>
          <p className="font-body text-ink text-body-min">
            {warband ? (
              <Link to={`/warbands/${warband.id}`} className="underline">{warband.name}</Link>
            ) : (
              <span className="text-ink-faded">warband deleted</span>
            )}{' '}
            against the recurring <strong>{campaign.nemesisName}</strong>.
          </p>
        </Plate>

        {/* The plot (premise public; goals hidden) */}
        <section className="space-y-3">
          <BannerHeader
            trailing={
              (complete || campaign.log.length > 0) ? (
                <button
                  onClick={() => saveCampaign({ ...campaign, agendaRevealed: !campaign.agendaRevealed })}
                  className="font-display uppercase tracking-[0.06em] text-on-banner text-xs min-h-[32px] px-2"
                >
                  {campaign.agendaRevealed ? 'Hide agenda' : 'Reveal agenda'}
                </button>
              ) : undefined
            }
          >
            {campaign.agenda.title}
          </BannerHeader>
          <Plate className="p-4 space-y-2">
            <p className="font-body text-ink text-body-min leading-relaxed">{campaign.agenda.premise}</p>
            {campaign.agendaRevealed ? (
              <ul className="mt-2 space-y-1">
                {campaign.agenda.actGoals.map((g, i) => (
                  <li key={i} className="font-body text-ink text-sm">{g}</li>
                ))}
                <li className="font-body text-ink text-sm mt-2">
                  <span className="font-display uppercase tracking-[0.05em]">Ultimately:</span> {campaign.agenda.victory}
                </li>
              </ul>
            ) : (
              <p className="font-body text-ink-faded text-xs">
                The enemy's true objective is hidden until the campaign ends.
              </p>
            )}
          </Plate>
        </section>

        {/* Play / record the next chapter */}
        {!complete && campaign.status === 'active' && (
          <section className="space-y-3">
            <BannerHeader
              trailing={<PageChip className="border-on-banner/40">{difficultyForBudget(budget)} · {budget} tn</PageChip>}
            >
              Chapter {campaign.chapter}
            </BannerHeader>
            <Plate className="p-4 space-y-3">
              <p className="font-body text-ink-faded text-sm">
                The {campaign.nemesisName} muster at {actLabel(campaign.act)} strength ({budget} tn). Play the
                battle, then record how it went.
              </p>
              {warband ? (
                <Button onClick={playChapter}>Play chapter {campaign.chapter} →</Button>
              ) : (
                <p className="font-body text-ink-faded text-sm">The warband for this campaign was deleted.</p>
              )}

              <div className="border-t border-steel-l pt-3 space-y-3">
                <p className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Record the result</p>
                <div className="flex gap-2">
                  {(['win', 'loss', 'draw'] as SoloResult[]).map((r) => (
                    <Button
                      key={r}
                      size="dense"
                      variant={result === r ? 'primary' : 'secondary'}
                      fullWidth={false}
                      onClick={() => setResult(r)}
                    >
                      {RESULT_LABELS[r]}
                    </Button>
                  ))}
                </div>
                <label className="block">
                  <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Scenario (optional)</span>
                  <TextField value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="e.g. Diamantine Hunt" />
                </label>
                <label className="block">
                  <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Notes (optional)</span>
                  <TextField value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How the battle turned…" />
                </label>
                <Button onClick={recordResult}>Record chapter {campaign.chapter}</Button>
              </div>
            </Plate>
          </section>
        )}

        {/* Finale */}
        {complete && campaign.status === 'active' && (
          <section className="space-y-3">
            <BannerHeader>The Campaign Ends</BannerHeader>
            <DesignerNote title="Finale">
              <p>
                Three acts fought — {wins} won, {losses} lost{draws ? `, ${draws} drawn` : ''}. Reveal the enemy's
                agenda above to see what they were truly after, then conclude the campaign.
              </p>
            </DesignerNote>
            <Button onClick={() => saveCampaign({ ...campaign, status: 'concluded', agendaRevealed: true })}>
              Conclude campaign
            </Button>
          </section>
        )}

        {/* Log */}
        <section className="space-y-3">
          <BannerHeader>Chronicle</BannerHeader>
          {campaign.log.length === 0 ? (
            <p className="font-body text-ink-faded text-sm px-1">No games recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {[...campaign.log].reverse().map((e, i) => (
                <Plate key={`${e.chapter}-${i}`} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">
                      {actLabel(e.act)} · Chapter {e.chapter}
                    </span>
                    <PageChip>{RESULT_LABELS[e.result]}</PageChip>
                  </div>
                  <p className="font-body text-ink-faded text-sm mt-1">
                    vs {e.opponentName}{e.scenario ? ` · ${e.scenario}` : ''}
                  </p>
                  {e.notes && <p className="font-body text-ink text-body-min mt-1">{e.notes}</p>}
                </Plate>
              ))}
            </div>
          )}
        </section>

        <div className="pt-2">
          <Button
            variant="danger"
            fullWidth={false}
            onClick={() => {
              if (window.confirm(`Delete the campaign "${campaign.name}"? This can't be undone.`)) {
                deleteCampaign(campaign.id);
                navigate('/solo', { replace: true });
              }
            }}
          >
            Delete campaign
          </Button>
        </div>
      </div>
    </div>
  );
}
