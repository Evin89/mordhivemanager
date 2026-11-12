import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import PageChip from '../components/PageChip';
import DesignerNote from '../components/DesignerNote';
import { Button, Select, TextField } from '../components/ui';
import BattlefieldMap from '../components/BattlefieldMap';
import { generateBattlefield } from '../lib/battlefield';
import { mulberry32, rollScenario, scenarioSetupRolls } from '../lib/scenarioGen';
import scenarioData from '../data/scenarios.json';
import endeavours from '../data/foolishEndeavours.json';
import { ScenariosData } from '../data/types';

const data: ScenariosData = scenarioData;
const newSeed = () => Math.floor(Math.random() * 4294967296);
const prose = 'whitespace-pre-line font-body text-ink leading-relaxed';

export default function ScenarioGeneratorScreen() {
  const [params, setParams] = useSearchParams();
  const [initialSeed] = useState(newSeed);
  const seedParam = params.get('seed');
  const seed = seedParam !== null && /^\d+$/.test(seedParam) && Number(seedParam) <= 4294967295 ? Number(seedParam) : initialSeed;
  const scenario = data.scenarios.find(s => s.id === params.get('s'));
  const [includeBonus, setIncludeBonus] = useState(false);
  const [roll, setRoll] = useState<ReturnType<typeof rollScenario> | null>(null);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState('');
  const setup = scenarioSetupRolls(mulberry32(seed ^ 0xa51c), scenario?.id ?? '').map((r, i) => {
    const value = Number(params.get(`r${i}`));
    return Number.isInteger(value) && value >= 1 && value <= 3 ? { ...r, dice: [value], value: value + r.modifier } : r;
  });
  function update(id: string, nextSeed = seed, reroll = false) {
    const next = new URLSearchParams({ s: id, seed: String(nextSeed) });
    scenarioSetupRolls(mulberry32(nextSeed ^ 0xa51c), id).forEach((r, i) => next.set(`r${i}`, String(reroll ? 1 + Math.floor(Math.random() * 3) : id === scenario?.id ? setup[i].dice[0] : r.dice[0])));
    setParams(next, { replace: true }); setCopied(false); setFallback('');
  }
  async function copy() {
    const url = new URL(window.location.href);
    url.searchParams.set('seed', String(seed));
    setup.forEach((r, i) => url.searchParams.set(`r${i}`, String(r.dice[0])));
    try { await navigator.clipboard.writeText(url.href); setCopied(true); }
    catch { setFallback(url.href); }
  }
  return <div className="space-y-6 scenario-generator">
    <style>{`@media print { .no-print, .scenario-generator button, .scenario-controls, .endeavours { display:none !important; } .scenario-generator { color:black; } .scenario-generator svg { max-height:90mm; } .scenario-generator section { break-inside:avoid; } }`}</style>
    <BannerHeader as="h1">Scenario Generator</BannerHeader>
    <Plate className="p-4 space-y-3 scenario-controls">
      <Button onClick={() => { const result = rollScenario(Math.random, { includeBonus }); setRoll(result); if (result.scenarioId) update(result.scenarioId); }}>Roll 2D6</Button>
      <label className="flex items-center gap-3 min-h-[44px]"><input type="checkbox" checked={includeBonus} onChange={e => setIncludeBonus(e.target.checked)} />Include bonus scenario</label>
      {roll && <p role="status">Dice {roll.dice.join(' + ')} = {roll.total} · {roll.scenarioId ? data.scenarios.find(s => s.id === roll.scenarioId)?.name : data.rollTable.find(r => r.roll === roll.total)?.note}</p>}
      <label className="block">{roll?.scenarioId === null ? 'Lower-rated player: choose a scenario' : 'Select a scenario'}
        <Select value={scenario?.id ?? ''} onChange={e => update(e.target.value)}><option value="">Choose a scenario…</option>{data.scenarios.filter(s => !roll || roll.scenarioId !== null || includeBonus || !s.bonus).map(s => <option key={s.id} value={s.id}>{s.bonus ? 'Bonus' : s.number}: {s.name}</option>)}</Select>
      </label>
    </Plate>
    <details><summary className="min-h-[44px] cursor-pointer">Pre-battle sequence</summary><p className={prose}>{data.preBattleSequence.intro}</p><ol className="list-decimal pl-6 space-y-3">{data.preBattleSequence.steps.map((s, i) => <li className={prose} key={i}>{s}</li>)}</ol></details>
    <DesignerNote title="Mord Hive Designers Note:"><p className={prose}>{data.designersNote}</p></DesignerNote>
    {scenario && <>
      <BannerHeader as="h2" trailing={<PageChip>{scenario.bonus ? 'Bonus' : scenario.number}</PageChip>}>{scenario.name}</BannerHeader>
      <p className={prose}>{scenario.story}</p>
      {scenario.sections.map((s, i) => <section key={i} className="space-y-2"><BannerHeader>{s.heading}</BannerHeader><p className={prose}>{s.text}</p>{s.heading === 'Special Rules' && scenario.chestTable && <table className="w-full text-left"><thead><tr><th>Items</th><th>D6 Result Needed</th></tr></thead><tbody>{scenario.chestTable.map(r => <tr key={r.item}><td>{r.item}</td><td>{r.needed}</td></tr>)}</tbody></table>}{s.heading === 'Special Rules' && scenario.profiles?.map(p => <Plate key={p.name} className="p-4 space-y-3"><h3>{p.name}</h3><p className="italic">{p.quote}</p><table className="w-full text-center"><thead><tr>{Object.keys(p.profile).map(k => <th key={k}>{k}</th>)}</tr></thead><tbody><tr>{Object.entries(p.profile).map(([k,v]) => <td key={k}>{v}</td>)}</tr></tbody></table><p className={prose}>Weapons/Armour: {p.equipment}</p>{p.specialRules.map(r => <div key={r.name}><h4 className="font-bold">{r.name}</h4><p className={prose}>{r.text}</p></div>)}</Plate>)}</section>)}
      <Plate className="p-4 space-y-3"><BannerHeader>Setup rolls</BannerHeader>{setup.length ? setup.map(r => <p key={r.label}>{r.label}: D3 ({r.dice.join(', ')}){r.modifier ? ` + ${r.modifier}` : ''} = {r.value}</p>) : <p>No scenario setup dice.</p>}<Button onClick={() => update(scenario.id, seed, true)}>Re-roll setup</Button></Plate>
      <Plate className="p-4 space-y-3"><BannerHeader>Battlefield</BannerHeader><p>Suggested terrain layout. Use the scenario rules above for placement and deployment.</p><BattlefieldMap field={generateBattlefield(seed, scenario.id, { counters: scenario.id === 'diamantine-hunt' ? setup[0]?.value : undefined, buildings: scenario.id === 'occupy' ? setup[0]?.value : undefined })} /><p>Seed: {seed}</p><Button onClick={() => update(scenario.id, newSeed())}>New map</Button><Button onClick={copy}>Copy link</Button><span role="status">{copied ? 'Copied' : ''}</span>{fallback && <label className="block no-print">Select and copy this link<TextField readOnly value={fallback} onFocus={e => e.target.select()} /></label>}</Plate>
    </>}
    <Endeavours />
  </div>;
}

type Card = typeof endeavours.cards[number];
function draw(count: number, excluded: Card[] = []) {
  const deck = endeavours.cards.filter(c => !excluded.some(e => e.id === c.id));
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck.slice(0, count);
}
function Endeavours() {
  const [mode, setMode] = useState('D3');
  const [fixed, setFixed] = useState(1);
  const [result, setResult] = useState('');
  const [hands, setHands] = useState<Card[][]>([[], []]);
  const [game, setGame] = useState(0);
  const [names, setNames] = useState(['Player 1', 'Player 2']);
  return <details className="endeavours"><summary className="cursor-pointer min-h-[44px]">Foolish Endeavours</summary><div className="space-y-4">
    <h2>{endeavours.howToUse.number} · {endeavours.howToUse.title}</h2><p className="italic">{endeavours.howToUse.flavour}</p><p className={prose}>{endeavours.howToUse.rules}</p>
    <label className="block">Number of endeavours<Select value={mode} onChange={e => setMode(e.target.value)}>{['D3','2D3','Fixed'].map(m => <option key={m}>{m}</option>)}</Select></label>
    {mode === 'Fixed' && <label className="block">Fixed number (up to {endeavours.cards.length - 1}, leaving a card for mulligans)<TextField type="number" min={1} max={endeavours.cards.length - 1} value={fixed} onChange={e => setFixed(Math.min(endeavours.cards.length - 1, Math.max(1, Number(e.target.value) || 1)))} /></label>}
    <Button onClick={() => { const dice = Array.from({ length: mode === '2D3' ? 2 : 1 }, () => 1 + Math.floor(Math.random()*3)); const count = mode === 'Fixed' ? fixed : dice.reduce((a,b) => a+b,0); setResult(mode === 'Fixed' ? `Fixed: ${count}` : `${mode}: ${dice.join(' + ')} = ${count}`); setHands([draw(count),draw(count)]); setGame(g => g+1); }}>Draw new hands</Button><p role="status">{result}</p>
    <div className="grid gap-4 md:grid-cols-2">{hands.map((cards,i) => <Player key={`${game}-${i}`} name={names[i]} onName={name => setNames(names.map((n,j) => i === j ? name : n))} initialCards={cards} />)}</div>
  </div></details>;
}
function Player({ name, onName, initialCards }: { name: string; onName: (name: string) => void; initialCards: Card[] }) {
  const [cards, setCards] = useState(initialCards);
  const [reveal, setReveal] = useState(false);
  const [used, setUsed] = useState(false);
  const [chosen, setChosen] = useState('0');
  return <Plate className="p-4 space-y-3"><label>Player name<TextField value={name} onChange={e => onName(e.target.value)} /></label><Button onClick={() => setReveal(r => !r)} aria-expanded={reveal}>{reveal ? 'Hide' : 'Reveal'} {cards.length} cards</Button>{reveal && <>{cards.map(c => <article className="border-t border-steel pt-3" key={c.id}><h3>{c.number} · {c.title}</h3><p className="italic">{c.flavour}</p><p className={prose}>{c.rules}</p></article>)}<label>Card to redraw<Select disabled={used || !cards.length} value={chosen} onChange={e => setChosen(e.target.value)}>{cards.map((c,i) => <option key={c.id} value={i}>{c.number} · {c.title}</option>)}</Select></label><Button disabled={used || !cards.length} onClick={() => { const next = draw(1,cards)[0]; if(next) { setCards(cards.map((c,i) => i === Number(chosen) ? next : c)); setUsed(true); } }}>Mulligan{used ? ' used' : ''}</Button></>}</Plate>;
}
