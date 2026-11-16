import { Dossier, SchemeClock, WantedBills, Prisoners } from '../components/Investigation';
import { normalizeHive, prisonerAction } from '../lib/hiveCampaign';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BackHeader from '../components/BackHeader';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import SoloNote from '../components/SoloNote';
import HiveMap from '../components/HiveMap';
import MissionCard from '../components/MissionCard';
import KnownEnemies from '../components/KnownEnemies';
import { Button } from '../components/ui';
import { abandonMission, controlLabel, outcomeText, SECTORS, SectorId } from '../lib/hiveCampaign';
import { useSoloCampaigns } from '../store/soloCampaign';
import { useWarbands } from '../store/warbands';
import { clearBattleSession, loadBattleSession } from '../store/battle';

export default function HiveCampaignScreen() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { getCampaign, saveCampaign, deleteCampaign } = useSoloCampaigns();
  const { warbands } = useWarbands();
  const [selected, setSelected] = useState<SectorId>('underhive');
  const campaign = getCampaign(campaignId);
  if (!campaign?.hive) return <Navigate to="/solo" replace />;
  const hive = normalizeHive(campaign.hive);
  const warband = warbands.find((item) => item.id === campaign.warbandId);
  const context = { warband: warband?.name ?? 'Warband', faction: campaign.nemesisName, agenda: campaign.agenda };
  const sector = SECTORS.find((item) => item.id === selected)!;
  const leaderName = hive.nemesis.find((hero) => hero.isLeader && hero.status === 'active')?.name ?? campaign.nemesisName;
  const yours = SECTORS.filter(({ id }) => !hive.dark.includes(id)).map(({ id }) => hive.control[id]).filter((value) => value >= 2).length;
  const theirs = SECTORS.filter(({ id }) => !hive.dark.includes(id)).map(({ id }) => hive.control[id]).filter((value) => value <= -2).length;
  const closed = campaign.status === 'concluded';

  function clearMissionBattle() {
    const session = loadBattleSession(campaign!.warbandId);
    if (session?.soloMission?.campaignId === campaign!.id
      && session.soloMission.missionId === hive.activeMissionId
      && !session.postBattleComplete) {
      clearBattleSession(campaign!.warbandId);
    }
  }

  function giveUp() {
    const next = abandonMission(hive, context);
    saveCampaign({ ...campaign!, hive: next, status: next.outcome ? 'concluded' : 'active' });
    clearMissionBattle();
  }

  return (
    <div className="space-y-6">
      <BackHeader title={campaign.name} to="/solo" />
      <SoloNote />
      <Plate className="p-4 space-y-2">
        <p className="font-ui text-brass-text text-xl">The Hive · Turn {hive.turn}{closed ? ' · Concluded' : ''}</p>
        <p className="font-body text-ink">
          {warband ? <Link className="inline-flex items-center min-h-[44px] underline" to={`/warbands/${warband.id}`}>{warband.name}</Link> : 'Warband deleted'}
          {' '}against the {campaign.nemesisName}
        </p>
        <p className="font-mono text-ink">Firmly held: you {yours} · them {theirs} · 4 wins the hive</p>
        <p className="font-body text-ink-faded text-sm">Four levels at +2 win the hive; four at −2 lose it.</p>
        <p className="font-ui text-ink">Clues {hive.clues} / 8</p>
        <SchemeClock scheme={hive.scheme} />
      </Plate>
      {hive.outcome && <Plate className="p-4 font-body text-ink">{[...hive.chronicle].reverse().find((item) => item.kind === 'outcome')?.text ?? outcomeText(hive.outcome, context)}</Plate>}
      <div className="hive-campaign-layout">
        <HiveMap state={hive} selected={selected} onSelect={setSelected} />
        <div className="space-y-4 min-w-0">
          <Plate className="p-4 space-y-2">
            <h2 className="font-ui text-brass-text text-xl">{sector.name}</h2>
            <p className="font-body text-ink">{sector.line}</p>
            <p className="font-ui text-ink">{hive.dark.includes(selected) ? 'Gone dark' : controlLabel(hive.control[selected])} ({hive.control[selected] > 0 ? '+' : ''}{hive.control[selected]})</p>
            <p className="font-body text-ink-faded text-sm">{hive.board.some((mission) => mission.sector === selected) ? 'Mission marked below.' : 'No mission here this turn.'}</p>
          </Plate>
          <BannerHeader>Mission board</BannerHeader>
          {!hive.board.length && !hive.outcome && campaign.status === 'active' && (
            <p className="font-body text-ink">No reachable sectors remain. You can conclude this campaign below.</p>
          )}
          {(hive.outcome || campaign.status !== 'active') && (
            <p className="font-body text-ink-faded">The campaign is over. No further missions.</p>
          )}
          {hive.board.map((mission) => (
            <div key={mission.id} className={mission.sector === selected ? 'outline outline-1 outline-brass outline-offset-2' : ''}>
              <MissionCard
                mission={mission}
                leaderName={leaderName}
                active={hive.activeMissionId === mission.id}
                disabled={closed || !warband || (hive.activeMissionId !== null && hive.activeMissionId !== mission.id)}
                onTake={() => {
                  setSelected(mission.sector);
                  saveCampaign({ ...campaign, hive: { ...hive, activeMissionId: mission.id } });
                }}
                onFight={() => navigate(`/warbands/${campaign.warbandId}/pre-battle?campaign=${campaign.id}`)}
                onAbandon={giveUp}
              />
            </div>
          ))}
        </div>
      </div>
      <Dossier agenda={campaign.agenda} clues={closed ? 8 : hive.clues} />
      <WantedBills state={hive} agenda={campaign.agenda} faction={campaign.nemesisName} type={campaign.nemesisType} />
      <Prisoners state={hive} onAction={(id, action) => {
        const next = prisonerAction(hive, id, action, context);
        saveCampaign({ ...campaign, hive: next, status: next.outcome ? 'concluded' : 'active' });
      }} />
      <KnownEnemies heroes={hive.nemesis} />
      <section className="space-y-3">
        <BannerHeader>Chronicle</BannerHeader>
        {[...hive.chronicle].reverse().map((item, index) => (
          <Plate key={`${item.turn}-${index}`} className="p-4 space-y-2">
            <p className="font-ui text-brass-text">Turn {item.turn} · {item.kind}</p>
            <p className="font-body text-ink">{item.text}</p>
          </Plate>
        ))}
      </section>
      <div className="space-y-3">
        {!closed && <Button variant="secondary" onClick={() => {
          saveCampaign({ ...campaign, status: 'concluded', hive: { ...hive, activeMissionId: null } });
          clearMissionBattle();
        }}>Conclude campaign</Button>}
        <Button variant="danger" onClick={() => {
          if (!window.confirm(`Delete the campaign "${campaign.name}"? This can't be undone.`)) return;
          clearMissionBattle();
          deleteCampaign(campaign.id);
          navigate('/solo', { replace: true });
        }}>Delete campaign</Button>
      </div>
    </div>
  );
}
