-- mh_0004_campaigns_ii.sql
--
-- Shared announcements, house rules, events and RSVPs, plus paired battle
-- reports. Still entirely inside the `mordhive` schema.

alter table mordhive.campaigns
  add column announcement text not null default '' check (char_length(announcement) <= 2000),
  add column announcement_at timestamptz,
  add column house_rules text not null default '' check (char_length(house_rules) <= 8000);

create function mordhive.stamp_announcement() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.announcement is distinct from old.announcement then
    new.announcement_at := case when new.announcement = '' then null else now() end;
  else
    new.announcement_at := old.announcement_at;
  end if;
  return new;
end;
$$;
create trigger campaigns_announcement before update on mordhive.campaigns
  for each row execute function mordhive.stamp_announcement();
revoke all on function mordhive.stamp_announcement() from public, anon;

create table mordhive.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references mordhive.campaigns(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at > starts_at),
  location text not null default '' check (char_length(location) <= 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index campaign_events_campaign_start_idx on mordhive.campaign_events(campaign_id, starts_at);
create table mordhive.campaign_event_rsvps (
  event_id uuid not null references mordhive.campaign_events(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key(event_id, user_id)
);
create index campaign_event_rsvps_user_idx on mordhive.campaign_event_rsvps(user_id);
create trigger campaign_event_rsvps_touch before update on mordhive.campaign_event_rsvps
  for each row execute function mordhive.touch_updated_at();
alter table mordhive.campaign_events enable row level security;
alter table mordhive.campaign_event_rsvps enable row level security;
create policy "members read events" on mordhive.campaign_events for select to authenticated
  using (mordhive.is_member(campaign_id));
create policy "leader creates events" on mordhive.campaign_events for insert to authenticated
  with check (mordhive.is_leader(campaign_id) and created_by = (select auth.uid()));
create policy "leader edits events" on mordhive.campaign_events for update to authenticated
  using (mordhive.is_leader(campaign_id)) with check (mordhive.is_leader(campaign_id));
create policy "leader deletes events" on mordhive.campaign_events for delete to authenticated
  using (mordhive.is_leader(campaign_id));
create policy "members read rsvps" on mordhive.campaign_event_rsvps for select to authenticated
  using (exists (select 1 from mordhive.campaign_events e where e.id = event_id and mordhive.is_member(e.campaign_id)));
create policy "members set own rsvp" on mordhive.campaign_event_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from mordhive.campaign_events e where e.id = event_id and mordhive.is_member(e.campaign_id)));
create policy "members edit own rsvp" on mordhive.campaign_event_rsvps for update to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from mordhive.campaign_events e where e.id = event_id and mordhive.is_member(e.campaign_id)))
  with check (user_id = (select auth.uid()) and exists (select 1 from mordhive.campaign_events e where e.id = event_id and mordhive.is_member(e.campaign_id)));
create policy "members clear own rsvp" on mordhive.campaign_event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from mordhive.campaign_events e where e.id = event_id and mordhive.is_member(e.campaign_id)));
grant select, insert, update, delete on mordhive.campaign_events, mordhive.campaign_event_rsvps to authenticated;
grant all on mordhive.campaign_events, mordhive.campaign_event_rsvps to service_role;

create function mordhive.report_campaign_battle(p_campaign uuid, p_played_on date, p_scenario text, p_participants jsonb, p_notes text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  -- Serialize reports for this campaign, including the case with no candidate yet.
  perform 1 from mordhive.campaigns where id = p_campaign for update;
  if not mordhive.is_member(p_campaign) then raise exception 'not a campaign member' using errcode = '42501'; end if;
  if p_participants is null or jsonb_typeof(p_participants) <> 'array' then
    raise exception 'participants must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_participants) = 0 or exists (
    select 1 from jsonb_array_elements(p_participants) p
    where not exists (select 1 from mordhive.warbands w where w.id = p->>'warbandId' and w.campaign_id = p_campaign)
  ) then raise exception 'participant warband is not linked to campaign' using errcode = '42501'; end if;
  if p_scenario is null or char_length(p_scenario) > 64 or char_length(coalesce(p_notes, '')) > 2000 then
    raise exception 'invalid scenario or notes' using errcode = '22023';
  end if;
  select b.id into target from mordhive.campaign_battles b
  where b.campaign_id = p_campaign and b.played_on = p_played_on
    and lower(btrim(b.scenario)) = lower(btrim(p_scenario))
    and b.reported_by <> uid and jsonb_array_length(b.participants) < 2
    and not exists (select 1 from jsonb_array_elements(b.participants) old_p
      cross join jsonb_array_elements(p_participants) new_p
      where old_p->>'warbandId' = new_p->>'warbandId')
  order by b.created_at, b.id limit 1 for update;
  if target is not null then
    update mordhive.campaign_battles set participants = participants || p_participants,
      notes = left(notes || case when coalesce(p_notes, '') = '' then ''
        when notes = '' then p_notes else E'\n' || p_notes end, 2000)
    where id = target;
  else
    insert into mordhive.campaign_battles(campaign_id, reported_by, played_on, scenario, participants, notes)
    values(p_campaign, uid, p_played_on, p_scenario, p_participants, coalesce(p_notes, '')) returning id into target;
  end if;
  return target;
end;
$$;
revoke all on function mordhive.report_campaign_battle(uuid, date, text, jsonb, text) from public, anon;
grant execute on function mordhive.report_campaign_battle(uuid, date, text, jsonb, text) to authenticated;
grant all on function mordhive.report_campaign_battle(uuid, date, text, jsonb, text) to service_role;

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

  delete from mordhive.campaign_event_rsvps r where r.user_id = uid
    and exists (select 1 from mordhive.campaign_events e where e.id = r.event_id and e.campaign_id = p_campaign);
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
  delete from mordhive.campaign_event_rsvps where user_id = uid;
  delete from mordhive.solo_campaigns where owner_id = uid;
  delete from mordhive.warbands where owner_id = uid;
  delete from mordhive.profiles where id = uid;
end;
$$;

revoke all on function mordhive.leave_campaign(uuid), mordhive.delete_my_data() from public, anon;
grant execute on function mordhive.leave_campaign(uuid), mordhive.delete_my_data() to authenticated;
grant all on function mordhive.leave_campaign(uuid), mordhive.delete_my_data() to service_role;
