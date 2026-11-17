-- Staff-controlled fallback for clubs that use front-desk entry instead of a GymOS QR scan.
create or replace function public.record_manual_check_in(p_member_id uuid, p_branch_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org_id uuid;
  v_capacity integer;
  v_inside integer;
  v_last_event text;
  v_event_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select b.organization_id, b.capacity into v_org_id, v_capacity
    from public.branches b where b.id=p_branch_id and b.is_active;
  if v_org_id is null or not private.can_access_branch(v_org_id,p_branch_id,array['owner','manager','branch_manager','receptionist']) then
    raise exception 'BRANCH_ACCESS_DENIED' using errcode='42501';
  end if;
  if not exists (select 1 from public.members m where m.id=p_member_id and m.organization_id=v_org_id and m.home_branch_id=p_branch_id and m.status='active') then
    raise exception 'MEMBER_NOT_FOUND_OR_INACTIVE' using errcode='P0002';
  end if;
  if not exists (select 1 from public.memberships ms where ms.member_id=p_member_id and ms.organization_id=v_org_id and ms.status='active' and ms.starts_at<=now() and ms.ends_at>=now()) then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED' using errcode='42501';
  end if;
  select a.event_type into v_last_event from public.attendance_events a
    where a.member_id=p_member_id and a.branch_id=p_branch_id
    order by a.occurred_at desc, a.created_at desc limit 1;
  if v_last_event='check_in' then raise exception 'MEMBER_ALREADY_CHECKED_IN' using errcode='23505'; end if;
  select greatest(0,
    (select count(*) from public.attendance_events a where a.branch_id=p_branch_id and a.event_type='check_in' and a.occurred_at::date=current_date)
    - (select count(*) from public.attendance_events a where a.branch_id=p_branch_id and a.event_type='check_out' and a.occurred_at::date=current_date)
  ) into v_inside;
  if v_capacity is not null and v_inside >= v_capacity then raise exception 'BRANCH_CAPACITY_REACHED' using errcode='23514'; end if;
  insert into public.attendance_events(organization_id,branch_id,member_id,event_type,source,recorded_by,reason,idempotency_key)
    values(v_org_id,p_branch_id,p_member_id,'check_in','staff_manual',(select auth.uid()),nullif(trim(coalesce(p_reason,'')),''),'manual:'||gen_random_uuid()::text)
    returning id into v_event_id;
  insert into public.occupancy_snapshots(organization_id,branch_id,inside_count,capacity)
    values(v_org_id,p_branch_id,v_inside+1,v_capacity);
  insert into public.audit_logs(organization_id,branch_id,actor_user_id,action,entity_type,entity_id,reason)
    values(v_org_id,p_branch_id,(select auth.uid()),'attendance.manual_check_in','attendance_events',v_event_id,p_reason);
  return v_event_id;
end;
$$;
revoke all on function public.record_manual_check_in(uuid,uuid,text) from public, anon;
grant execute on function public.record_manual_check_in(uuid,uuid,text) to authenticated;
