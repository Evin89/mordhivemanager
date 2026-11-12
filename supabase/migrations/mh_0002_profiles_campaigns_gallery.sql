-- mh_0002_profiles_campaigns_gallery.sql
--
-- Profiles (display names), campaigns with join codes, a shared battle log, and
-- the hooks for the public gallery. Still entirely inside the `mordhive` schema
-- (plan §3): Mordheim Manager's `public` tables are not read or written.
--
-- Access model, mirroring Mordheim Manager §8.3:
--   - a warband's owner can do anything with it;
--   - a `public` warband is readable by anyone, signed in or not (gallery);
--   - a warband linked to a campaign is readable by every member of that
--     campaign, whatever its own visibility;
--   - campaigns, their members and their battle log are visible to members only.
-- Creating and joining campaigns goes through SECURITY DEFINER RPCs, so there is
-- no INSERT policy on campaigns or campaign_members at all.

-- Profiles ------------------------------------------------------------------
-- Mord Hive's own display name, separate from MM's public.profiles so a player
-- can be "Kane" here and "Evin" there. Created by the client on first sign-in
-- (no trigger on auth.users: that table belongs to both apps).

create table mordhive.profiles (
  id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_touch before update on mordhive.profiles
  for each row execute function mordhive.touch_updated_at();

alter table mordhive.profiles enable row level security;

-- Display names only — readable by anyone so gallery cards and standings can
-- say whose warband it is.
create policy "anyone reads display names" on mordhive.profiles
  for select to anon, authenticated using (true);
create policy "user creates own profile" on mordhive.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "user updates own profile" on mordhive.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select on mordhive.profiles to anon;
grant select, insert, update on mordhive.profiles to authenticated;

-- Campaigns -----------------------------------------------------------------

create table mordhive.campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  join_code  text not null unique check (join_code ~ '^[A-Z2-9]{6}$'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  notes      text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaigns_touch before update on mordhive.campaigns
  for each row execute function mordhive.touch_updated_at();

create table mordhive.campaign_members (
  campaign_id uuid not null references mordhive.campaigns (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'player' check (role in ('leader', 'player')),
  joined_at   timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create index campaign_members_user_idx on mordhive.campaign_members (user_id);

alter table mordhive.warbands
  add column campaign_id uuid references mordhive.campaigns (id) on delete set null;
create index warbands_campaign_idx on mordhive.warbands (campaign_id) where campaign_id is not null;

create table mordhive.campaign_battles (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references mordhive.campaigns (id) on delete cascade,
  reported_by uuid references auth.users (id) on delete set null default auth.uid(),
  played_on   date not null default current_date,
  scenario    text not null default '' check (char_length(scenario) <= 64),
  -- [{ "warbandId": "...", "name": "...", "result": "win" | "loss" | "draw" }]
  -- Names are copied in so the log still reads after a warband is deleted.
  participants jsonb not null default '[]'::jsonb check (jsonb_typeof(participants) = 'array'),
  notes       text not null default '' check (char_length(notes) <= 2000),
  created_at  timestamptz not null default now()
);

create index campaign_battles_campaign_idx on mordhive.campaign_battles (campaign_id, played_on desc, created_at desc);

-- Membership helpers ---------------------------------------------------------
-- SECURITY DEFINER so policies on campaign_members can ask about
-- campaign_members without recursing into their own RLS.

create or replace function mordhive.is_member(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from mordhive.campaign_members m
    where m.campaign_id = p_campaign and m.user_id = auth.uid()
  );
$$;

create or replace function mordhive.is_leader(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from mordhive.campaign_members m
    where m.campaign_id = p_campaign and m.user_id = auth.uid() and m.role = 'leader'
  );
$$;

revoke all on function mordhive.is_member(uuid) from public;
revoke all on function mordhive.is_leader(uuid) from public;
grant execute on function mordhive.is_member(uuid) to authenticated;
grant execute on function mordhive.is_leader(uuid) to authenticated;

-- RLS -----------------------------------------------------------------------

alter table mordhive.campaigns enable row level security;
alter table mordhive.campaign_members enable row level security;
alter table mordhive.campaign_battles enable row level security;

create policy "members read campaign" on mordhive.campaigns
  for select to authenticated using (mordhive.is_member(id));
create policy "leader edits campaign" on mordhive.campaigns
  for update to authenticated using (mordhive.is_leader(id)) with check (mordhive.is_leader(id));
create policy "leader deletes campaign" on mordhive.campaigns
  for delete to authenticated using (mordhive.is_leader(id));

create policy "members read members" on mordhive.campaign_members
  for select to authenticated using (mordhive.is_member(campaign_id));
create policy "leader removes players" on mordhive.campaign_members
  for delete to authenticated
  using (mordhive.is_leader(campaign_id) and user_id <> (select auth.uid()));

create policy "members read battle log" on mordhive.campaign_battles
  for select to authenticated using (mordhive.is_member(campaign_id));
create policy "members add to battle log" on mordhive.campaign_battles
  for insert to authenticated
  with check (mordhive.is_member(campaign_id) and reported_by = (select auth.uid()));
create policy "reporter or leader removes a battle" on mordhive.campaign_battles
  for delete to authenticated
  using (reported_by = (select auth.uid()) or mordhive.is_leader(campaign_id));

-- Warbands: campaign-mates can read linked rosters; owners can only link a
-- warband to a campaign they belong to.
create policy "campaign members read linked warbands" on mordhive.warbands
  for select to authenticated
  using (campaign_id is not null and mordhive.is_member(campaign_id));

drop policy "owner inserts own warbands" on mordhive.warbands;
create policy "owner inserts own warbands" on mordhive.warbands
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (campaign_id is null or mordhive.is_member(campaign_id))
  );

drop policy "owner updates own warbands" on mordhive.warbands;
create policy "owner updates own warbands" on mordhive.warbands
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (campaign_id is null or mordhive.is_member(campaign_id))
  );

grant select, update, delete on mordhive.campaigns to authenticated;
grant select, delete on mordhive.campaign_members to authenticated;
grant select, insert, delete on mordhive.campaign_battles to authenticated;
grant all on all tables in schema mordhive to service_role;

-- RPCs ----------------------------------------------------------------------

-- Six characters without 0/O/1/I, easy to read out over WhatsApp.
create or replace function mordhive.new_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from mordhive.campaigns c where c.join_code = code);
  end loop;
  return code;
end;
$$;

create or replace function mordhive.create_campaign(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'sign in to create a campaign' using errcode = '28000';
  end if;
  insert into mordhive.campaigns (name, join_code, created_by)
  values (btrim(p_name), mordhive.new_join_code(), uid)
  returning id into new_id;
  insert into mordhive.campaign_members (campaign_id, user_id, role) values (new_id, uid, 'leader');
  return new_id;
end;
$$;

create or replace function mordhive.join_campaign(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if uid is null then
    raise exception 'sign in to join a campaign' using errcode = '28000';
  end if;
  select c.id into target from mordhive.campaigns c
  where c.join_code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  if target is null then
    raise exception 'no campaign with that join code' using errcode = 'P0002';
  end if;
  insert into mordhive.campaign_members (campaign_id, user_id, role)
  values (target, uid, 'player')
  on conflict (campaign_id, user_id) do nothing;
  return target;
end;
$$;

create or replace function mordhive.regenerate_join_code(p_campaign uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text;
begin
  if not mordhive.is_leader(p_campaign) then
    raise exception 'only the campaign leader can change the join code' using errcode = '42501';
  end if;
  code := mordhive.new_join_code();
  update mordhive.campaigns set join_code = code where id = p_campaign;
  return code;
end;
$$;

-- Leaving unlinks your warbands from the campaign. A leader who leaves hands
-- leadership to the longest-standing player; the last member out deletes the
-- campaign (and with it the battle log).
create or replace function mordhive.leave_campaign(p_campaign uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  was_leader boolean;
  successor uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select m.role = 'leader' into was_leader
  from mordhive.campaign_members m where m.campaign_id = p_campaign and m.user_id = uid;
  if was_leader is null then
    return; -- not a member: nothing to do
  end if;

  update mordhive.warbands set campaign_id = null where campaign_id = p_campaign and owner_id = uid;
  delete from mordhive.campaign_members where campaign_id = p_campaign and user_id = uid;

  if not exists (select 1 from mordhive.campaign_members m where m.campaign_id = p_campaign) then
    delete from mordhive.campaigns where id = p_campaign;
  elsif was_leader and not exists (
    select 1 from mordhive.campaign_members m where m.campaign_id = p_campaign and m.role = 'leader'
  ) then
    select m.user_id into successor from mordhive.campaign_members m
    where m.campaign_id = p_campaign order by m.joined_at, m.user_id limit 1;
    update mordhive.campaign_members set role = 'leader'
    where campaign_id = p_campaign and user_id = successor;
  end if;
end;
$$;

-- Removes everything this user has in Mord Hive. Deliberately NOT an account
-- deletion: the auth account is shared with Mordheim Manager, and deleting it
-- here would take the player's Mordheim warbands with it.
create or replace function mordhive.delete_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  for c in select m.campaign_id from mordhive.campaign_members m where m.user_id = uid loop
    perform mordhive.leave_campaign(c);
  end loop;
  delete from mordhive.solo_campaigns where owner_id = uid;
  delete from mordhive.warbands where owner_id = uid;
  delete from mordhive.profiles where id = uid;
end;
$$;

revoke all on function mordhive.new_join_code() from public;
revoke all on function mordhive.create_campaign(text) from public;
revoke all on function mordhive.join_campaign(text) from public;
revoke all on function mordhive.regenerate_join_code(uuid) from public;
revoke all on function mordhive.leave_campaign(uuid) from public;
revoke all on function mordhive.delete_my_data() from public;
grant execute on function mordhive.create_campaign(text) to authenticated;
grant execute on function mordhive.join_campaign(text) to authenticated;
grant execute on function mordhive.regenerate_join_code(uuid) to authenticated;
grant execute on function mordhive.leave_campaign(uuid) to authenticated;
grant execute on function mordhive.delete_my_data() to authenticated;
