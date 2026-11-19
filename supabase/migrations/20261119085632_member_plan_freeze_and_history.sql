-- Let linked members see their own plan event history and the club's available plans.
drop policy if exists "linked members read own membership events" on public.membership_events;
create policy "linked members read own membership events" on public.membership_events
for select to authenticated
using (
  exists (
    select 1 from public.memberships ms
    where ms.id = membership_id
      and private.is_linked_member(ms.organization_id, ms.member_id)
  )
);

drop policy if exists "linked members read available plan options" on public.membership_plans;
create policy "linked members read available plan options" on public.membership_plans
for select to authenticated
using (
  is_active and exists (
    select 1 from public.members m
    where m.organization_id = membership_plans.organization_id
      and private.is_linked_member(m.organization_id, m.id)
  )
);

create or replace function public.freeze_my_membership(p_membership_id uuid, p_days integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.memberships%rowtype;
  v_freeze_until timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_days not in (7, 14, 30) then
    raise exception 'FREEZE_DAYS_NOT_ALLOWED' using errcode = '22023';
  end if;

  select * into v_membership
  from public.memberships
  where id = p_membership_id
  for update;

  if v_membership.id is null
    or not private.is_linked_member(v_membership.organization_id, v_membership.member_id) then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = '42501';
  end if;
  if v_membership.status <> 'active'
    or v_membership.starts_at > now()
    or v_membership.ends_at <= now()
    or v_membership.freeze_until is not null then
    raise exception 'MEMBERSHIP_CANNOT_BE_FROZEN' using errcode = '23514';
  end if;

  v_freeze_until := now() + make_interval(days => p_days);
  update public.memberships
  set status = 'frozen',
      freeze_from = now(),
      freeze_until = v_freeze_until,
      ends_at = ends_at + make_interval(days => p_days),
      updated_at = now()
  where id = p_membership_id;

  insert into public.membership_events(organization_id, membership_id, event_type, actor_user_id, reason, metadata)
  values (
    v_membership.organization_id, p_membership_id, 'frozen', (select auth.uid()),
    'Member requested plan freeze',
    jsonb_build_object('days', p_days, 'freeze_until', v_freeze_until)
  );
  return p_membership_id;
end;
$$;

create or replace function public.resume_my_membership(p_membership_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.memberships%rowtype;
  v_planned_days integer;
  v_elapsed_days integer;
  v_unused_days integer;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_membership
  from public.memberships
  where id = p_membership_id
  for update;

  if v_membership.id is null
    or not private.is_linked_member(v_membership.organization_id, v_membership.member_id) then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = '42501';
  end if;
  if v_membership.status <> 'frozen'
    or v_membership.freeze_from is null
    or v_membership.freeze_until is null then
    raise exception 'MEMBERSHIP_NOT_FROZEN' using errcode = '23514';
  end if;

  v_planned_days := greatest(1, ceil(extract(epoch from (v_membership.freeze_until - v_membership.freeze_from)) / 86400)::integer);
  v_elapsed_days := least(
    v_planned_days,
    greatest(1, ceil(extract(epoch from (now() - v_membership.freeze_from)) / 86400)::integer)
  );
  v_unused_days := greatest(0, v_planned_days - v_elapsed_days);

  update public.memberships
  set status = 'active',
      ends_at = ends_at - make_interval(days => v_unused_days),
      freeze_from = null,
      freeze_until = null,
      updated_at = now()
  where id = p_membership_id;

  insert into public.membership_events(organization_id, membership_id, event_type, actor_user_id, reason, metadata)
  values (
    v_membership.organization_id, p_membership_id, 'resumed', (select auth.uid()),
    'Member resumed plan',
    jsonb_build_object('days_frozen', v_elapsed_days, 'unused_days_returned', v_unused_days)
  );
  return p_membership_id;
end;
$$;

revoke all on function public.freeze_my_membership(uuid, integer) from public, anon;
grant execute on function public.freeze_my_membership(uuid, integer) to authenticated;
revoke all on function public.resume_my_membership(uuid) from public, anon;
grant execute on function public.resume_my_membership(uuid) to authenticated;
