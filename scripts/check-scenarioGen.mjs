import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';

const data = JSON.parse(fs.readFileSync('src/data/scenarios.json', 'utf8'));
function load(source, imports = {}) {
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require: id => { if (!(id in imports)) throw Error(id); return imports[id]; } });
  return exports;
}
const gen = load(fs.readFileSync('src/lib/scenarioGen.ts', 'utf8'), { '../data/scenarios.json': data });
const field = load(fs.readFileSync('src/lib/battlefield.ts', 'utf8'), { './scenarioGen': gen });
const normal = value => JSON.parse(JSON.stringify(value));
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
  let i = 0;
  const result = gen.rollScenario(() => ([a,b][i++] - 0.5) / 6, { includeBonus: true });
  assert.deepEqual(normal(result.dice), [a,b]);
  assert.equal(result.total, a+b);
  assert.equal(result.scenarioId, data.rollTable.find(r => r.roll === a+b).scenario);
  assert(result.choices.includes('dont-wake-the-daemonhost'));
}
assert(!gen.rollScenario(() => 0).choices.includes('dont-wake-the-daemonhost'));
for (const [id, lo, hi, count] of [['diamantine-hunt',2,4,1],['occupy',3,5,1],['chance-encounter',1,3,2]]) {
  for (const face of [0,0.4,0.999999]) {
    const rolls = gen.scenarioSetupRolls(() => face,id);
    assert.equal(rolls.length,count);
    rolls.forEach(r => { assert(r.value >= lo && r.value <= hi); assert.equal(r.value,r.dice[0]+r.modifier); });
  }
}
assert.equal(gen.scenarioSetupRolls(() => { throw Error('unexpected dice'); },'skirmish').length,0);
assert.deepEqual(normal(gen.scenarioSetupRolls(gen.mulberry32(42),'chance-encounter')),normal(gen.scenarioSetupRolls(gen.mulberry32(42),'chance-encounter')));
assert.equal(field.generateBattlefield(42,'diamantine-hunt',{counters:2}).markers.length,2);
assert.equal(field.generateBattlefield(42,'occupy',{buildings:5}).markers.length,5);
assert.deepEqual(normal(field.generateBattlefield(42,'dont-wake-the-daemonhost').markers.map(m => m.label)),['Lair','Chest','Chest']);
// Compare the archived implementation after transpilation, ignoring line endings.
const original = execFileSync('git',['-c','safe.directory=*','show','72811f2:src/lib/battlefield.ts'], { encoding:'utf8' });
const baseline = load(original);
for (const s of data.scenarios.filter(s => !s.bonus)) for (const seed of [0,1,42,4294967295]) assert.deepEqual(normal(field.generateBattlefield(seed,s.id)),normal(baseline.generateBattlefield(seed,s.id)));
const source = fs.readFileSync('docs/source/scenarios-v0.5-source.txt','utf8');
const squash = text => text.replace(/\s+/g,' ').replace(/ \. /g,' ').replace(/ \.$/,'').trim();
const canonical = squash(source.replace(/\r/g,'').replace(/^---$|^\[Pagina.*$|^(?:Z|110)$/gm,''));
assert(canonical.includes(squash(data.preBattleSequence.intro)));
data.preBattleSequence.steps.forEach(step=>assert(canonical.includes(squash(step))));
assert(canonical.includes(squash(data.designersNote)));
for (const s of data.scenarios) {
  assert(canonical.includes(squash(s.story)), `Source story: ${s.id}`);
  for (const section of s.sections) assert(canonical.includes(squash(section.text)), `Source section: ${s.id}/${section.heading}`);
  const xp = s.sections.find(s => s.heading === 'Experience').text;
  assert.equal(new Set(s.sections.map(s=>s.heading)).size,s.sections.length,`Duplicate headings: ${s.id}`);
  for (const award of s.awards) {
    assert(award.note.length > 10, `Empty award: ${s.id}/${award.id}`);
    const rule = award.id === 'refinedDiamantine' ? s.sections.find(s=>s.heading==='Refined Diamantine').text : xp;
    assert(squash(rule).includes(squash(award.note)), `Award: ${s.id}/${award.id}`);
  }
  assert.equal(s.awards.filter(a=>a.id!=='refinedDiamantine').length,(xp.match(/^\+\d/gm)||[]).length-1, `Award count: ${s.id}`);
  for (const p of s.profiles || []) {
    assert(canonical.includes(squash(p.quote)));
    assert(canonical.includes(squash(p.equipment)));
    assert(canonical.includes(Object.values(p.profile).join(' ')));
    for (const r of p.specialRules) assert(canonical.includes(squash(r.text)),`Profile rule: ${r.name}`);
  }
  for (const r of s.chestTable || []) assert(canonical.includes(`${r.item} ${r.needed}`));
}
assert.equal(data.scenarios.length,10);
assert(!data.rollTable.some(r=>r.scenario==='dont-wake-the-daemonhost'));
console.log('PASS: all 36 scenario rolls, bonus choices, setup ranges, determinism, rolled map counts, 36 baseline maps, and source text/awards.');
