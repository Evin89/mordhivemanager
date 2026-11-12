// RLS + RPC matrix for the `mordhive` schema, run against an in-process
// Postgres (PGlite) with a minimal stand-in for Supabase's auth schema and
// roles. `npm run db:test`. Applies every migration in order, then checks who
// can see and do what. Exits non-zero if any expectation fails.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

const dir = new URL('../migrations/', import.meta.url);
for (const f of fs.readdirSync(dir).filter((f) => f.startsWith('mh_')).sort()) {
  await db.exec(fs.readFileSync(new URL(f, dir), 'utf8'));
}

const A = '11111111-1111-1111-1111-111111111111'; // campaign leader
const B = '22222222-2222-2222-2222-222222222222'; // joins A's campaign
const C = '33333333-3333-3333-3333-333333333333'; // outsider
await db.exec(`insert into auth.users values ('${A}'), ('${B}'), ('${C}')`);

async function as(role, sub, sql) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ''}', false); set role ${role};`);
  try {
    return (await db.query(sql)).rows;
  } catch (e) {
    return `ERR: ${e.message}`;
  } finally {
    await db.exec('reset role');
  }
}
const user = (sub, sql) => as('authenticated', sub, sql);
const anon = (sql) => as('anon', null, sql);

let failed = 0;
function check(label, value, ok) {
  const pass = ok(value);
  if (!pass) failed++;
  console.log(pass ? 'ok  ' : 'FAIL', label.padEnd(52), JSON.stringify(value));
}
const rows = (n) => (v) => Array.isArray(v) && v.length === n;
const denied = (v) => typeof v === 'string' && v.startsWith('ERR');
const ids = (expected) => (v) => Array.isArray(v) && JSON.stringify(v.map((r) => r.id)) === JSON.stringify(expected);

// --- mh_0001: warbands + solo campaigns -------------------------------------
check('A inserts private warband', await user(A, `insert into mordhive.warbands (id,name,warband_type,data) values ('w1','Kane','ork-mob','{}') returning id`), rows(1));
check('A inserts public warband', await user(A, `insert into mordhive.warbands (id,name,warband_type,visibility,data) values ('w2','Pub','ork-mob','public','{}') returning id`), rows(1));
check('A sees both own warbands', await user(A, `select id from mordhive.warbands order by id`), ids(['w1', 'w2']));
check('C sees only the public warband', await user(C, `select id from mordhive.warbands order by id`), ids(['w2']));
check('anon sees only the public warband', await anon(`select id from mordhive.warbands order by id`), ids(['w2']));
check("C can't update A's warband", await user(C, `update mordhive.warbands set name='x' where id='w1' returning id`), rows(0));
check("C can't delete A's public warband", await user(C, `delete from mordhive.warbands where id='w2' returning id`), rows(0));
check("C can't insert a warband as A", await user(C, `insert into mordhive.warbands (id,owner_id,name,warband_type,data) values ('w9','${A}','x','y','{}')`), denied);
check("A can't give a warband away", await user(A, `update mordhive.warbands set owner_id='${C}' where id='w1'`), denied);
check("anon can't insert", await anon(`insert into mordhive.warbands (id,name,warband_type,data) values ('w8','x','y','{}')`), denied);
check('updated_at moves on update', await user(A, `update mordhive.warbands set name='Kane2' where id='w1' returning updated_at > created_at as touched`), (v) => v[0]?.touched === true);
check('A creates a solo campaign', await user(A, `insert into mordhive.solo_campaigns (id,warband_id,data) values ('s1','w1','{}') returning id`), rows(1));
check("C can't see A's solo campaign", await user(C, `select id from mordhive.solo_campaigns`), rows(0));
check("anon can't read solo campaigns", await anon(`select id from mordhive.solo_campaigns`), denied);

// --- mh_0002: profiles --------------------------------------------------------
check('A creates own profile', await user(A, `insert into mordhive.profiles (display_name) values ('Kane') returning id`), (v) => v[0]?.id === A);
check("C can't create A's profile", await user(C, `insert into mordhive.profiles (id, display_name) values ('${A}', 'x')`), denied);
check("C can't rename A", await user(C, `update mordhive.profiles set display_name='x' where id='${A}' returning id`), rows(0));
check('anon reads display names', await anon(`select display_name from mordhive.profiles`), rows(1));

// --- mh_0002: campaigns -------------------------------------------------------
const created = await user(A, `select mordhive.create_campaign('Hive Wars') as id`);
const camp = created[0]?.id;
check('A creates a campaign via RPC', created, (v) => typeof v[0]?.id === 'string');
check("direct insert into campaigns is denied", await user(A, `insert into mordhive.campaigns (name, join_code) values ('x','ABCDEF')`), denied);
const code = (await user(A, `select join_code from mordhive.campaigns where id='${camp}'`))[0]?.join_code;
check('join code looks right', code, (v) => /^[A-HJ-NP-Z2-9]{6}$/.test(v ?? ''));
check('A is the leader', await user(A, `select role from mordhive.campaign_members where campaign_id='${camp}'`), (v) => v[0]?.role === 'leader');
check("C can't see the campaign", await user(C, `select id from mordhive.campaigns`), rows(0));
check("C can't link a warband to it", await user(C, `insert into mordhive.warbands (id,name,warband_type,data,campaign_id) values ('c1','x','y','{}','${camp}')`), denied);
check('B joins with a lower-case, spaced code', await user(B, `select mordhive.join_campaign(' ${code.toLowerCase().slice(0, 3)} ${code.toLowerCase().slice(3)} ') as id`), (v) => v[0]?.id === camp);
check('joining twice is harmless', await user(B, `select mordhive.join_campaign('${code}') as id`), (v) => v[0]?.id === camp);
check('a wrong code is an error', await user(B, `select mordhive.join_campaign('ZZZZZZ')`), denied);
check('B sees the campaign and both members', await user(B, `select count(*)::int n from mordhive.campaign_members where campaign_id='${camp}'`), (v) => v[0]?.n === 2);
check('A links private w1 to the campaign', await user(A, `update mordhive.warbands set campaign_id='${camp}' where id='w1' returning id`), rows(1));
check('B now reads private w1 (campaign-mate)', await user(B, `select id from mordhive.warbands where id='w1'`), rows(1));
check('C still cannot read w1', await user(C, `select id from mordhive.warbands where id='w1'`), rows(0));
check("B can't edit A's linked warband", await user(B, `update mordhive.warbands set name='x' where id='w1' returning id`), rows(0));
check('B logs a battle', await user(B, `insert into mordhive.campaign_battles (campaign_id, scenario, participants) values ('${camp}','skirmish','[{"warbandId":"w1","name":"Kane","result":"win"}]') returning id`), rows(1));
check("C can't log a battle there", await user(C, `insert into mordhive.campaign_battles (campaign_id) values ('${camp}')`), denied);
check("C can't read the battle log", await user(C, `select id from mordhive.campaign_battles`), rows(0));
check("B can't rename the campaign", await user(B, `update mordhive.campaigns set name='x' where id='${camp}' returning id`), rows(0));
check('A renames the campaign', await user(A, `update mordhive.campaigns set name='Hive Wars II' where id='${camp}' returning id`), rows(1));
check("B can't regenerate the join code", await user(B, `select mordhive.regenerate_join_code('${camp}')`), denied);
check('A regenerates the join code', await user(A, `select mordhive.regenerate_join_code('${camp}') as code`), (v) => v[0]?.code && v[0].code !== code);
check("B can't kick A", await user(B, `delete from mordhive.campaign_members where campaign_id='${camp}' and user_id='${A}' returning user_id`), rows(0));
// --- mh_0004: reports, campaign text, events and RSVPs ------------------------
await user(B, `insert into mordhive.warbands(id,name,warband_type,data,campaign_id) values ('b4','B band','x','{}','${camp}')`);
const report = (who, band, scenario = 'Dedupe') => user(who, `select mordhive.report_campaign_battle('${camp}', '2026-11-12', '${scenario}', '[{"warbandId":"${band}","name":"Band","result":"draw"}]', 'notes') as id`);
const firstReport = await report(A, 'w1');
check('report RPC inserts a row', firstReport, (v) => typeof v[0]?.id === 'string');
check('other member report merges', await report(B, 'b4', ' dedupe '), (v) => v[0]?.id === firstReport[0]?.id);
check('merged game is one row with two participants', await user(A, `select jsonb_array_length(participants) as n from mordhive.campaign_battles where lower(trim(scenario))='dedupe'`), (v) => v.length === 1 && v[0]?.n === 2);
const sameUser = await report(A, 'w1', 'Repeat');
check('same user reporting twice does not merge', await report(A, 'w1', 'Repeat'), (v) => v[0]?.id && v[0].id !== sameUser[0]?.id);
check('outsider cannot report', await report(C, 'w1'), denied);
check('unlinked participant rejected', await report(A, 'w2'), denied);
check('announcement timestamp set', await user(A, `update mordhive.campaigns set announcement='Next game', house_rules='Be kind' where id='${camp}' returning announcement_at is not null as stamped`), (v) => v[0]?.stamped === true);
check('announcement timestamp cleared', await user(A, `update mordhive.campaigns set announcement='' where id='${camp}' returning announcement_at`), (v) => v.length === 1 && v[0].announcement_at === null);
check('player cannot edit announcement or house rules', await user(B, `update mordhive.campaigns set announcement='x',house_rules='x' where id='${camp}' returning id`), rows(0));
const eventCreated = await user(A, `insert into mordhive.campaign_events(campaign_id,title,starts_at) values ('${camp}','Game night','2026-12-01T18:00:00Z') returning id`);
check('leader creates event', eventCreated, rows(1));
const event4 = eventCreated[0]?.id;
check('member reads events', await user(B, `select id from mordhive.campaign_events`), rows(1));
check('outsider cannot read events', await user(C, `select id from mordhive.campaign_events`), rows(0));
check('player cannot create event', await user(B, `insert into mordhive.campaign_events(campaign_id,title,starts_at) values ('${camp}','x',now())`), denied);
check('B sets own RSVP', await user(B, `insert into mordhive.campaign_event_rsvps(event_id,status) values ('${event4}','going') returning user_id`), (v) => v[0]?.user_id === B);
check('B cannot set RSVP for A', await user(B, `insert into mordhive.campaign_event_rsvps(event_id,user_id,status) values ('${event4}','${A}','going')`), denied);
check('outsider cannot RSVP', await user(C, `insert into mordhive.campaign_event_rsvps(event_id,status) values ('${event4}','going')`), denied);
await user(B, `select mordhive.leave_campaign('${camp}')`);
check('leave removes RSVPs', (await db.query(`select user_id from mordhive.campaign_event_rsvps where user_id='${B}'`)).rows, rows(0));
// Rejoin so all original leadership checks retain their original setup.
const currentCode = (await user(A, `select join_code from mordhive.campaigns where id='${camp}'`))[0]?.join_code;
await user(B, `select mordhive.join_campaign('${currentCode}')`);

check('A leaves: leadership passes to B', await user(A, `select mordhive.leave_campaign('${camp}')`), rows(1));
check('B is now leader', await user(B, `select role from mordhive.campaign_members where campaign_id='${camp}'`), (v) => v.length === 1 && v[0].role === 'leader');
check("A's warband was unlinked on leaving", await user(A, `select campaign_id from mordhive.warbands where id='w1'`), (v) => v[0]?.campaign_id === null);
check('B leaves last: campaign is gone', await user(B, `select mordhive.leave_campaign('${camp}')`), rows(1));
check('…and its battle log with it', (await db.query(`select count(*)::int n from mordhive.campaign_battles`)).rows, (v) => v[0]?.n === 0);

// --- mh_0003: battle history ---------------------------------------------
check('A records a private battle', await user(A, `insert into mordhive.battles (warband_id, result, scenario, rating_after) values ('w1','win','Skirmish',120) returning id`), rows(1));
check("C can't read A's battles", await user(C, `select id from mordhive.battles`), rows(0));
check("C can't record a battle for A's warband", await user(C, `insert into mordhive.battles (warband_id, result) values ('w1','loss')`), denied);
const c3 = (await user(A, `select mordhive.create_campaign('Third') as id`))[0]?.id;
const code3 = (await user(A, `select join_code from mordhive.campaigns where id='${c3}'`))[0]?.join_code;
await user(B, `select mordhive.join_campaign('${code3}')`);
check('A records a campaign battle', await user(A, `insert into mordhive.battles (warband_id, campaign_id, result, rating_after) values ('w2','${c3}','draw',90) returning id`), rows(1));
check('B (campaign-mate) reads only the campaign battle', await user(B, `select result from mordhive.battles`), (v) => Array.isArray(v) && v.length === 1 && v[0].result === 'draw');
check('C creates a warband of its own', await user(C, `insert into mordhive.warbands (id,name,warband_type,data) values ('c9','x','y','{}')`), rows(0));
check("…nor insert one there", await user(C, `insert into mordhive.battles (warband_id, campaign_id, result) values ('c9','${c3}','win')`), denied);
check('deleting a warband deletes its battles', await user(A, `delete from mordhive.warbands where id='w1' returning id`), rows(1));
check("…so A's private battle is gone", (await db.query(`select count(*)::int n from mordhive.battles where warband_id='w1'`)).rows, (v) => v[0]?.n === 0);

// --- mh_0002: delete my data -------------------------------------------------
const c2 = (await user(A, `select mordhive.create_campaign('Second') as id`))[0]?.id;
await user(C, `select mordhive.join_campaign((select join_code from mordhive.campaigns where id='${c2}'))`);
check("C can't join via a code it never saw (sanity: C isn't in)", await user(C, `select count(*)::int n from mordhive.campaign_members`), (v) => v[0]?.n === 0);
const deleteEvent4 = (await user(A, `insert into mordhive.campaign_events(campaign_id,title,starts_at) values ('${c3}','Cleanup',now()) returning id`))[0]?.id;
await user(A, `insert into mordhive.campaign_event_rsvps(event_id,status) values ('${deleteEvent4}','maybe')`);
check('A deletes all Mord Hive data', await user(A, `select mordhive.delete_my_data()`), rows(1));
check('delete_my_data removes RSVPs', (await db.query(`select user_id from mordhive.campaign_event_rsvps where user_id='${A}'`)).rows, rows(0));
check("A's warbands, solo campaigns, profile are gone", (await db.query(`select (select count(*) from mordhive.warbands where owner_id='${A}')::int + (select count(*) from mordhive.solo_campaigns where owner_id='${A}')::int + (select count(*) from mordhive.profiles where id='${A}')::int as n`)).rows, (v) => v[0]?.n === 0);
check("A's auth account survives (shared with MM)", (await db.query(`select count(*)::int n from auth.users where id='${A}'`)).rows, (v) => v[0]?.n === 1);

check('public schema untouched', (await db.query(`select count(*)::int n from information_schema.tables where table_schema='public'`)).rows, (v) => v[0]?.n === 0);

if (failed) {
  console.error(`${failed} expectation(s) failed`);
  process.exit(1);
}
console.log('all expectations passed');
