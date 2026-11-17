import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import { Button, Select, TextField } from '../components/ui';
import { generateId } from '../lib/id';
import { useWarbands } from '../store/warbands';
import { useSoloCampaigns, SoloCampaign } from '../store/soloCampaign';
import { generateCampaignAgenda, actLabel } from '../lib/soloAgenda';
import { warbandDefinitionsByName, getWarbandTypeName } from '../data/warbandRegistry';
import { createHiveState } from '../lib/hiveCampaign';
import { buildNpcWarband } from '../lib/npc';
import { computeWarbandRating } from '../lib/rating';

const CHAPTERS_PER_ACT = 3;

/** Solo campaigns list + create. A solo campaign links games for one warband
 * against a recurring app-built nemesis across three acts (spec §6). */
export default function SoloCampaignsScreen() {
  const navigate = useNavigate();
  const { warbands } = useWarbands();
  const { campaigns, createCampaign } = useSoloCampaigns();

  const [name, setName] = useState('');
  const [warbandId, setWarbandId] = useState('');
  const [nemesis, setNemesis] = useState('random');
  const [kind, setKind] = useState<'hive' | 'classic'>('hive');
  const [strength, setStrength] = useState<'hive' | 'matched'>('hive');

  const canCreate = warbands.length > 0 && (warbandId || warbands[0]);

  function create() {
    const wbId = warbandId || warbands[0]?.id;
    if (!wbId) return;
    const def =
      nemesis === 'random'
        ? warbandDefinitionsByName[Math.floor(Math.random() * warbandDefinitionsByName.length)]
        : warbandDefinitionsByName.find((d) => d.id === nemesis);
    if (!def) return;
    const wb = warbands.find((w) => w.id === wbId);
    const campaign: SoloCampaign = {
      kind,
      hive: kind === 'hive'
        ? createHiveState({ warband: wb?.name ?? 'Warband', faction: def.name, rating: wb ? computeWarbandRating(wb) : undefined }, buildNpcWarband(def, 500).heroes, Math.random, strength)
        : undefined,
      id: generateId(),
      name: name.trim() || `${wb?.name ?? 'Warband'} — Solo Campaign`,
      warbandId: wbId,
      nemesisType: def.id,
      nemesisName: def.name,
      agenda: generateCampaignAgenda(),
      agendaRevealed: false,
      act: 1,
      chapter: 1,
      chaptersPerAct: kind === 'hive' ? 0 : CHAPTERS_PER_ACT,
      log: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    createCampaign(campaign);
    navigate(`/solo/${campaign.id}`);
  }

  return (
    <div className="space-y-6">
      <BannerHeader as="h1">Solo Campaigns</BannerHeader>
      <p className="font-body text-ink text-body-min">
        Fight for six levels in The Hive, or follow the original Three Acts format.
        Both link games against a recurring nemesis. App-original · Not part of the ruleset.
      </p>

      {/* Existing campaigns */}
      {campaigns.length > 0 && (
        <section className="space-y-3">
          <BannerHeader>Your Campaigns</BannerHeader>
          <div className="space-y-2">
            {campaigns.map((c) => {
              const wb = warbands.find((w) => w.id === c.warbandId);
              const wins = c.log.filter((e) => e.result === 'win').length;
              const losses = c.log.filter((e) => e.result === 'loss').length;
              return (
                <Link key={c.id} to={`/solo/${c.id}`} className="block hover:opacity-90">
                  <Plate className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display uppercase tracking-[0.04em] text-ink text-lg">{c.name}</span>
                      <PageChip>{c.status === 'concluded' ? 'Concluded' : c.kind === 'hive' ? `Turn ${c.hive?.turn ?? 1}` : actLabel(c.act)}</PageChip>
                    </div>
                    <p className="font-body text-ink-faded text-sm mt-1">
                      {c.kind === 'hive' ? 'The Hive' : 'Three Acts'} · {wb?.name ?? 'Unknown warband'} vs {c.nemesisName}
                      {c.kind !== 'hive' && ` · ${c.log.length} games (${wins}W / ${losses}L)`}
                    </p>
                  </Plate>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* New campaign */}
      <section className="space-y-3">
        <BannerHeader>New Solo Campaign</BannerHeader>
        {warbands.length === 0 ? (
          <Plate className="p-4">
            <p className="font-body text-ink text-body-min">
              You need a warband first. <Link to="/warbands/new" className="underline">Create one</Link>, then start a solo campaign.
            </p>
          </Plate>
        ) : (
          <Plate className="p-4 space-y-3">
            <label className="block">
              <span className="font-ui text-ink-faded">Campaign type</span>
              <Select value={kind} onChange={(event) => setKind(event.target.value as 'hive' | 'classic')}>
                <option value="hive">The Hive</option>
                <option value="classic">Three Acts — the original format</option>
              </Select>
            </label>
            {kind === 'hive' && <label className="block">
              <span className="font-ui text-ink-faded">Enemy strength</span>
              <Select value={strength} onChange={(event) => setStrength(event.target.value as 'hive' | 'matched')}>
                <option value="hive">The hive's own (grows each turn)</option>
                <option value="matched">Matched to your warband (its rating)</option>
              </Select>
            </label>}
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Campaign name</span>
              <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Long Dark" />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Your warband</span>
              <Select value={warbandId || warbands[0].id} onChange={(e) => setWarbandId(e.target.value)}>
                {warbands.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({getWarbandTypeName(w.warbandType)})</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-[0.06em] text-ink-faded text-xs">Nemesis faction</span>
              <Select value={nemesis} onChange={(e) => setNemesis(e.target.value)}>
                <option value="random">Surprise me</option>
                {warbandDefinitionsByName.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </label>
            <Button onClick={create} disabled={!canCreate}>Begin campaign</Button>
          </Plate>
        )}
      </section>
    </div>
  );
}
