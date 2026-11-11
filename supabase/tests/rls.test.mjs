import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
// RLS matrix for the mordhive schema, run against an in-process Postgres
// (PGlite) with a minimal stand-in for Supabase's auth schema and roles.
// `npm run db:test`. Exits non-zero if any expectation fails.
const db = new PGlite();
const mig = fs.readFileSync(new URL('../migrations/mh_0001_mordhive_schema.sql', import.meta.url), 'utf8');
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
`);
await db.exec(mig);
const A='11111111-1111-1111-1111-111111111111', B='22222222-2222-2222-2222-222222222222';
async function as(role, sub, sql){
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub||''}', false); set role ${role};`);
  try { const r = await db.query(sql); return r.rows; } catch(e){ return 'ERR: '+e.message; } finally { await db.exec('reset role'); }
}
let failed = 0;
const expectations = {
  'A inserts private': (v) => Array.isArray(v) && v.length === 1,
  'A inserts public': (v) => Array.isArray(v) && v.length === 1,
  'A sees own': (v) => Array.isArray(v) && v.length === 2,
  'B sees only public': (v) => JSON.stringify(v) === '[{"id":"w2"}]',
  'anon sees only public': (v) => JSON.stringify(v) === '[{"id":"w2"}]',
  'B update A warband (0 rows)': (v) => Array.isArray(v) && v.length === 0,
  'B delete A public warband (0 rows)': (v) => Array.isArray(v) && v.length === 0,
  'B insert as A (denied)': (v) => typeof v === 'string' && v.startsWith('ERR'),
  'A steals by owner change (denied)': (v) => typeof v === 'string' && v.startsWith('ERR'),
  'anon insert (denied)': (v) => typeof v === 'string' && v.startsWith('ERR'),
  'updated_at touches': (v) => Array.isArray(v) && v[0]?.touched === true,
  'A solo insert': (v) => Array.isArray(v) && v.length === 1,
  'B sees no solo': (v) => Array.isArray(v) && v.length === 0,
  'anon solo (denied)': (v) => typeof v === 'string' && v.startsWith('ERR'),
  'public schema untouched': (v) => v[0]?.n === 0,
};
const out = (l, v) => {
  const ok = expectations[l](v);
  if (!ok) failed++;
  console.log(ok ? 'ok  ' : 'FAIL', l.padEnd(40), JSON.stringify(v));
};
out('A inserts private', await as('authenticated',A,`insert into mordhive.warbands (id,name,warband_type,data) values ('w1','Kane','ork-mob','{}') returning owner_id`));
out('A inserts public', await as('authenticated',A,`insert into mordhive.warbands (id,name,warband_type,visibility,data) values ('w2','Pub','ork-mob','public','{}') returning id`));
out('A sees own', await as('authenticated',A,`select id from mordhive.warbands order by id`));
out('B sees only public', await as('authenticated',B,`select id from mordhive.warbands order by id`));
out('anon sees only public', await as('anon',null,`select id from mordhive.warbands order by id`));
out('B update A warband (0 rows)', await as('authenticated',B,`update mordhive.warbands set name='x' where id='w1' returning id`));
out('B delete A public warband (0 rows)', await as('authenticated',B,`delete from mordhive.warbands where id='w2' returning id`));
out('B insert as A (denied)', await as('authenticated',B,`insert into mordhive.warbands (id,owner_id,name,warband_type,data) values ('w3','${A}','x','y','{}')`));
out('A steals by owner change (denied)', await as('authenticated',A,`update mordhive.warbands set owner_id='${B}' where id='w1'`));
out('anon insert (denied)', await as('anon',null,`insert into mordhive.warbands (id,name,warband_type,data) values ('w4','x','y','{}')`));
out('updated_at touches', await as('authenticated',A,`update mordhive.warbands set name='Kane2' where id='w1' returning updated_at > created_at as touched`));
out('A solo insert', await as('authenticated',A,`insert into mordhive.solo_campaigns (id,warband_id,data) values ('s1','w1','{}') returning id`));
out('B sees no solo', await as('authenticated',B,`select id from mordhive.solo_campaigns`));
out('anon solo (denied)', await as('anon',null,`select id from mordhive.solo_campaigns`));
out('public schema untouched', (await db.query(`select count(*)::int n from information_schema.tables where table_schema='public'`)).rows);

if (failed) { console.error(`${failed} RLS expectation(s) failed`); process.exit(1); }
console.log('all RLS expectations passed');
