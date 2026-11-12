-- mh_0003_battle_history.sql
--
-- One row per battle a warband fought, written when the post-battle sequence is
-- confirmed (MM §34 "Your Battles", reskinned). Gives every warband a history
-- and, through rating_after, its rating over time (MM §18.3) without a second
-- table. Still entirely inside the `mordhive` schema.
--
-- Readable by the owner, and by campaign-mates when the battle was fought by a
-- warband linked to a campaign (campaign_id is copied at write time, so a later
-- unlink doesn't rewrite history).

create table mordhive.battles (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  warband_id   text not null references mordhive.warbands (id) on delete cascade,
  campaign_id  uuid references mordhive.campaigns (id) on delete set null,
  played_on    date not null default current_date,
  result       text not null check (result in ('win', 'loss', 'draw')),
  scenario     text not null default '' check (char_length(scenario) <= 120),
  opponent     text not null default '' check (char_length(opponent) <= 120),
  rating_after integer not null default 0,
  -- The BattleRecord from src/types.ts: casualties, XP, income, notes.
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index battles_warband_idx on mordhive.battles (warband_id, played_on desc, created_at desc);
create index battles_owner_idx on mordhive.battles (owner_id);
create index battles_campaign_idx on mordhive.battles (campaign_id) where campaign_id is not null;

alter table mordhive.battles enable row level security;

create policy "owner reads own battles" on mordhive.battles
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "campaign members read campaign battles" on mordhive.battles
  for select to authenticated
  using (campaign_id is not null and mordhive.is_member(campaign_id));
create policy "owner records own battles" on mordhive.battles
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from mordhive.warbands w where w.id = warband_id and w.owner_id = (select auth.uid()))
    and (campaign_id is null or mordhive.is_member(campaign_id))
  );
create policy "owner deletes own battles" on mordhive.battles
  for delete to authenticated using (owner_id = (select auth.uid()));

grant select, insert, delete on mordhive.battles to authenticated;
grant all on mordhive.battles to service_role;

-- delete_my_data(): battles go with the warbands (on delete cascade).
