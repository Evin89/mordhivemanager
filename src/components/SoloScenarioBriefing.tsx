import { findSoloScenario } from '../lib/soloScenarios';
import { SoloPlate } from './SoloNote';
import scenarios from '../data/scenarios.json';

export default function SoloScenarioBriefing({ name }: { name: string }) {
  const def = findSoloScenario(name);
  if (!def) return null;
  const skirmish = scenarios.scenarios.find(s => s.id === 'skirmish');
  return (
    <SoloPlate>
      <h2 className="font-heading text-3xl">{def.name}</h2>
      <p>{def.briefing}</p>
      {[...def.setup, ...def.special].map(line => <p key={line}>{line}</p>)}
      <p>Win: {def.win}</p>
      <p>Lose: {def.lose}</p>
      <p>+1 {scenarios.universalAward.label} — {scenarios.universalAward.note}</p>
      {skirmish?.awards.map(a => <p key={a.id}>{a.amount} {a.label} — {a.note}</p>)}
    </SoloPlate>
  );
}
