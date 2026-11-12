-- mh_0001_mordhive_schema.sql
--
-- Mord Hive's own data, inside the SHARED Supabase project it borrows from
-- Mordheim Manager (plan: claude/mordhive-setup-plan.md §3). Everything lives in
-- the `mordhive` schema; this migration never touches `public`, so Mordheim
-- Manager's tables, RPCs, directory, gallery and admin screens are unaffected.
--
-- Shared with Mordheim Manager: auth.users only (one account works in both
-- apps). Note: MM's on-signup trigger also creates a public.profiles row for
-- people who sign up through Mord Hive — harmless (directory is opt-in), but
-- they will show up in MM's admin user counts.
--
-- After applying: add `mordhive` to Settings → API → Exposed schemas, or the
-- client gets "The schema must be one of the following" (PGRST106).

create schema if not exists mordhive;

grant usage on schema mordhive to anon, authenticated, service_role;

-- updated_at bookkeeping -----------------------------------------------------

create or replace function mordhive.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Warbands ------------------------------------------------------------------
-- Same shape as MM's public.warbands: the rich roster lives in `data` (the
-- Warband object from src/types.ts); a few columns are lifted out so lists,
-- the future gallery and admin queries never have to open the jsonb.
-- `id` is text, not uuid: src/lib/id.ts falls back to a non-uuid id on
-- browsers without crypto.randomUUID, and imported localStorage warbands keep
-- whatever id they were created with.

create table mordhive.warbands (
  id           text primary key check (char_length(id) between 1 and 64),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  warband_type text not null check (char_length(warband_type) between 1 and 64),
  visibility   text not null default 'private' check (visibility in ('private', 'public')),
  rating       integer not null default 0,
  data         jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index warbands_owner_idx on mordhive.warbands (owner_id);
create index warbands_public_idx on mordhive.warbands (updated_at desc) where visibility = 'public';

create trigger warbands_touch before update on mordhive.warbands
  for each row execute function mordhive.touch_updated_at();

alter table mordhive.warbands enable row level security;

-- (select auth.uid()) is wrapped so Postgres evaluates it once per query, not
-- once per row — the same fix as MM's 0042_rls_initplan_wrap.
create policy "owner reads own warbands" on mordhive.warbands
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "anyone reads public warbands" on mordhive.warbands
  for select to anon, authenticated using (visibility = 'public');
create policy "owner inserts own warbands" on mordhive.warbands
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owner updates own warbands" on mordhive.warbands
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "owner deletes own warbands" on mordhive.warbands
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Solo campaigns --------------------------------------------------------------
-- Private by nature (the hidden agenda lives in `data`), so owner-only, no
-- public read. Deleting a warband does not delete its solo campaigns, matching
-- the local store; the screen copes with a missing warband.

create table mordhive.solo_campaigns (
  id         text primary key check (char_length(id) between 1 and 64),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  warband_id text,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index solo_campaigns_owner_idx on mordhive.solo_campaigns (owner_id);

create trigger solo_campaigns_touch before update on mordhive.solo_campaigns
  for each row execute function mordhive.touch_updated_at();

alter table mordhive.solo_campaigns enable row level security;

create policy "owner manages own solo campaigns" on mordhive.solo_campaigns
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Grants ----------------------------------------------------------------------
-- RLS decides which rows; grants decide which verbs. anon may only read
-- (and RLS limits that to public warbands).

grant select on mordhive.warbands to anon;
grant select, insert, update, delete on mordhive.warbands to authenticated;
grant select, insert, update, delete on mordhive.solo_campaigns to authenticated;
grant all on all tables in schema mordhive to service_role;
