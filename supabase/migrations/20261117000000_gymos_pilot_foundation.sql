-- GymOS pilot foundation. Organization and branch IDs are included from day one.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','inactive')),
  timezone text not null default 'Africa/Cairo',
  currency char(3) not null default 'EGP',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  code text not null,
  address text,
  timezone text not null default 'Africa/Cairo',
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, id)
);

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_path text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','branch_manager','receptionist','trainer','nutritionist','accountant','member')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);
create index organization_users_user_idx on public.organization_users(user_id, organization_id) where status = 'active';

create table public.user_branch_access (
  id uuid primary key default gen_random_uuid(),
  organization_user_id uuid not null references public.organization_users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_user_id, branch_id),
  foreign key (organization_id, organization_user_id) references public.organization_users(organization_id, id) on delete cascade,
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete cascade
);
create index user_branch_access_branch_idx on public.user_branch_access(branch_id);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  home_branch_id uuid,
  member_number text not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  gender text check (gender is null or gender in ('female','male','non_binary','prefer_not_to_say')),
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  joined_at timestamptz not null default now(),
  external_member_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, home_branch_id) references public.branches(organization_id, id),
  unique (organization_id, member_number),
  unique (organization_id, id)
);
create index members_org_status_idx on public.members(organization_id, status);
create index members_branch_idx on public.members(home_branch_id, created_at desc);
create index members_external_idx on public.members(organization_id, external_member_id) where external_member_id is not null;

create table public.member_user_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  link_method text not null default 'one_time_code' check (link_method in ('one_time_code','staff_verified')),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, member_id, user_id),
  foreign key (organization_id, member_id) references public.members(organization_id, id) on delete cascade
);
create unique index member_user_links_active_member on public.member_user_links(member_id) where revoked_at is null;
create unique index member_user_links_active_user on public.member_user_links(organization_id, user_id) where revoked_at is null;
create index member_user_links_user_idx on public.member_user_links(user_id) where revoked_at is null;

create table public.member_link_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, member_id) references public.members(organization_id, id) on delete cascade
);
create index member_link_codes_member_idx on public.member_link_codes(member_id, expires_at desc);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  duration_days integer not null check (duration_days > 0),
  price_minor bigint not null default 0 check (price_minor >= 0),
  currency char(3) not null default 'EGP',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null,
  plan_id uuid not null,
  branch_id uuid references public.branches(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('pending','active','frozen','suspended','expired','cancelled')),
  freeze_from timestamptz,
  freeze_until timestamptz,
  external_membership_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (freeze_until is null or freeze_from is null or freeze_until > freeze_from),
  foreign key (organization_id, member_id) references public.members(organization_id, id) on delete restrict,
  foreign key (organization_id, plan_id) references public.membership_plans(organization_id, id) on delete restrict,
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  unique (organization_id, id)
);
create index memberships_member_status_idx on public.memberships(member_id, status, ends_at desc);
create index memberships_org_expiry_idx on public.memberships(organization_id, ends_at) where status in ('active','frozen');

create table public.membership_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  membership_id uuid not null,
  event_type text not null check (event_type in ('activated','frozen','resumed','expired','cancelled','suspended','renewed')),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, membership_id) references public.memberships(organization_id, id) on delete restrict
);
create index membership_events_membership_idx on public.membership_events(membership_id, occurred_at desc);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  branch_id uuid not null,
  member_id uuid not null,
  event_type text not null check (event_type in ('check_in','check_out','correction')),
  occurred_at timestamptz not null default now(),
  source text not null default 'gymos_qr' check (source in ('gymos_qr','staff_manual','access_system','import')),
  idempotency_key text unique,
  recorded_by uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  foreign key (organization_id, member_id) references public.members(organization_id, id) on delete restrict
);
create index attendance_branch_time_idx on public.attendance_events(branch_id, occurred_at desc);
create index attendance_member_time_idx on public.attendance_events(member_id, occurred_at desc);

create table public.occupancy_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  branch_id uuid not null,
  captured_at timestamptz not null default now(),
  inside_count integer not null check (inside_count >= 0),
  capacity integer check (capacity is null or capacity > 0),
  calculation_version integer not null default 1,
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict
);
create index occupancy_branch_time_idx on public.occupancy_snapshots(branch_id, captured_at desc);

create table public.class_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  default_duration_minutes integer not null default 60 check (default_duration_minutes > 0),
  color text,
  is_active boolean not null default true,
  unique (organization_id, name),
  unique (organization_id, id)
);

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  branch_id uuid,
  display_name text not null,
  bio text,
  qualifications text,
  specialties text[] not null default '{}',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  branch_id uuid not null,
  class_type_id uuid,
  trainer_id uuid,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  booking_opens_at timestamptz not null default now(),
  booking_closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (booking_closes_at >= booking_opens_at),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict,
  foreign key (organization_id, class_type_id) references public.class_types(organization_id, id) on delete restrict,
  foreign key (organization_id, trainer_id) references public.trainers(organization_id, id) on delete restrict,
  unique (organization_id, id)
);
create index classes_branch_start_idx on public.classes(branch_id, starts_at);

create table public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_id uuid not null,
  member_id uuid not null,
  status text not null default 'booked' check (status in ('booked','cancelled','waitlisted','attended','no_show')),
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  checked_in_at timestamptz,
  unique (class_id, member_id),
  foreign key (organization_id, class_id) references public.classes(organization_id, id) on delete restrict,
  foreign key (organization_id, member_id) references public.members(organization_id, id) on delete restrict
);
create index class_bookings_member_idx on public.class_bookings(member_id, booked_at desc);
create index class_bookings_class_status_idx on public.class_bookings(class_id, status);

create table public.inbody_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null,
  measured_at timestamptz not null,
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg > 0),
  body_fat_percent numeric(5,2) check (body_fat_percent is null or body_fat_percent between 0 and 100),
  muscle_mass_kg numeric(6,2) check (muscle_mass_kg is null or muscle_mass_kg > 0),
  report_path text,
  source text not null default 'manual' check (source in ('manual','inbody_import')),
  member_visible boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, member_id) references public.members(organization_id, id) on delete cascade
);
create index inbody_member_measured_idx on public.inbody_measurements(member_id, measured_at desc);

create table public.qr_credentials (
  token_hash text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, member_id) references public.members(organization_id, id) on delete cascade
);
create index qr_credentials_expiry_idx on public.qr_credentials(expires_at);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  branch_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, branch_id) references public.branches(organization_id, id) on delete restrict
);
create index audit_org_time_idx on public.audit_logs(organization_id, created_at desc);

create or replace function private.has_org_role(p_org_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_users ou
    where ou.organization_id = p_org_id and ou.user_id = (select auth.uid()) and ou.status = 'active'
      and (p_roles is null or ou.role = any(p_roles))
  );
$$;
revoke all on function private.has_org_role(uuid,text[]) from public, anon;
grant execute on function private.has_org_role(uuid,text[]) to authenticated, service_role;

create or replace function private.can_access_branch(p_org_id uuid, p_branch_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_users ou
    where ou.organization_id = p_org_id and ou.user_id = (select auth.uid()) and ou.status = 'active'
      and (p_roles is null or ou.role = any(p_roles))
      and (
        ou.role in ('owner','manager','accountant')
        or exists (select 1 from public.user_branch_access uba where uba.organization_user_id = ou.id and uba.branch_id = p_branch_id)
      )
  );
$$;
revoke all on function private.can_access_branch(uuid,uuid,text[]) from public, anon;
grant execute on function private.can_access_branch(uuid,uuid,text[]) to authenticated, service_role;

create or replace function private.is_linked_member(p_org_id uuid, p_member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.member_user_links l where l.organization_id = p_org_id and l.member_id = p_member_id and l.user_id = (select auth.uid()) and l.revoked_at is null);
$$;
revoke all on function private.is_linked_member(uuid,uuid) from public, anon;
grant execute on function private.is_linked_member(uuid,uuid) to authenticated, service_role;

create or replace function public.create_user_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles(user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_user_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_user_profile();

create or replace function public.link_member_with_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_code public.member_link_codes%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if length(trim(coalesce(p_code,''))) < 6 or length(trim(p_code)) > 32 then raise exception 'INVALID_LINK_CODE' using errcode = '22023'; end if;
  select * into v_code from public.member_link_codes
    where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
      and consumed_at is null and expires_at > now()
    for update;
  if not found then raise exception 'LINK_CODE_INVALID_OR_EXPIRED' using errcode = '22023'; end if;
  if exists (select 1 from public.member_user_links where organization_id = v_code.organization_id and user_id = (select auth.uid()) and revoked_at is null) then
    raise exception 'ACCOUNT_ALREADY_LINKED' using errcode = '23505';
  end if;
  insert into public.member_user_links(organization_id, member_id, user_id, link_method)
    values (v_code.organization_id, v_code.member_id, (select auth.uid()), 'one_time_code');
  update public.member_link_codes set consumed_at = now() where id = v_code.id;
  return v_code.member_id;
end;
$$;
revoke all on function public.link_member_with_code(text) from public, anon;
grant execute on function public.link_member_with_code(text) to authenticated;

create or replace function public.create_member_with_membership(
  p_branch_id uuid,
  p_member_number text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_plan_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org_id uuid; v_duration integer; v_member_id uuid; v_membership_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select b.organization_id into v_org_id from public.branches b where b.id=p_branch_id and b.is_active;
  if v_org_id is null or not private.can_access_branch(v_org_id,p_branch_id,array['owner','manager','branch_manager','receptionist']) then
    raise exception 'BRANCH_ACCESS_DENIED' using errcode='42501';
  end if;
  select duration_days into v_duration from public.membership_plans where id=p_plan_id and organization_id=v_org_id and is_active;
  if v_duration is null then raise exception 'MEMBERSHIP_PLAN_INVALID' using errcode='22023'; end if;
  if length(trim(coalesce(p_first_name,'')))=0 or length(trim(coalesce(p_last_name,'')))=0 or length(trim(coalesce(p_member_number,'')))=0 then
    raise exception 'MEMBER_FIELDS_REQUIRED' using errcode='22023';
  end if;
  insert into public.members(organization_id,home_branch_id,member_number,first_name,last_name,email,status)
    values(v_org_id,p_branch_id,trim(p_member_number),trim(p_first_name),trim(p_last_name),nullif(trim(coalesce(p_email,'')),''),'active')
    returning id into v_member_id;
  insert into public.memberships(organization_id,member_id,plan_id,branch_id,starts_at,ends_at,status,created_by)
    values(v_org_id,v_member_id,p_plan_id,p_branch_id,now(),now()+make_interval(days=>v_duration),'active',(select auth.uid()))
    returning id into v_membership_id;
  insert into public.membership_events(organization_id,membership_id,event_type,actor_user_id)
    values(v_org_id,v_membership_id,'activated',(select auth.uid()));
  return v_member_id;
end;
$$;
revoke all on function public.create_member_with_membership(uuid,text,text,text,text,uuid) from public, anon;
grant execute on function public.create_member_with_membership(uuid,text,text,text,text,uuid) to authenticated;

create or replace function public.book_class(p_class_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_class public.classes%rowtype; v_member_id uuid; v_booking_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select m.id into v_member_id from public.members m join public.member_user_links l on l.member_id=m.id
    where l.user_id=(select auth.uid()) and l.revoked_at is null and m.status='active' limit 1;
  if v_member_id is null then raise exception 'MEMBER_ACCOUNT_NOT_LINKED' using errcode = '42501'; end if;
  select * into v_class from public.classes where id=p_class_id for update;
  if not found or v_class.status <> 'scheduled' then raise exception 'CLASS_UNAVAILABLE' using errcode = '22023'; end if;
  if now() < v_class.booking_opens_at or now() > v_class.booking_closes_at then raise exception 'BOOKING_WINDOW_CLOSED' using errcode = '22023'; end if;
  if not exists (select 1 from public.memberships ms where ms.member_id=v_member_id and ms.status='active' and ms.starts_at<=now() and ms.ends_at>=now()) then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;
  if (select count(*) from public.class_bookings cb where cb.class_id=p_class_id and cb.status in ('booked','attended')) >= v_class.capacity then
    raise exception 'CLASS_CAPACITY_REACHED' using errcode = '23514';
  end if;
  insert into public.class_bookings(organization_id,class_id,member_id) values(v_class.organization_id,p_class_id,v_member_id)
    on conflict (class_id,member_id) do update set status='booked',booked_at=now(),cancelled_at=null
    where public.class_bookings.status='cancelled'
    returning id into v_booking_id;
  if v_booking_id is null then raise exception 'ALREADY_BOOKED' using errcode = '23505'; end if;
  return v_booking_id;
end;
$$;
revoke all on function public.book_class(uuid) from public, anon;
grant execute on function public.book_class(uuid) to authenticated;

create or replace function public.cancel_class_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  update public.class_bookings cb set status='cancelled', cancelled_at=now()
  where cb.id=p_booking_id and cb.status='booked'
    and exists (select 1 from public.member_user_links l where l.member_id=cb.member_id and l.user_id=(select auth.uid()) and l.revoked_at is null);
  if not found then raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.cancel_class_booking(uuid) from public, anon;
grant execute on function public.cancel_class_booking(uuid) to authenticated;

create or replace function private.has_org_role_for_user(p_user_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_users ou where ou.user_id=p_user_id and ou.status='active' and (p_roles is null or ou.role=any(p_roles)));
$$;
revoke all on function private.has_org_role_for_user(uuid,text[]) from public, anon;
grant execute on function private.has_org_role_for_user(uuid,text[]) to service_role;

create or replace function public.consume_member_qr(p_token_hash text, p_branch_id uuid, p_staff_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_qr public.qr_credentials%rowtype; v_event_id uuid; v_org uuid; v_capacity integer; v_inside integer;
begin
  if coalesce(current_setting('request.jwt.claim.role', true),'') <> 'service_role' then raise exception 'SERVICE_ONLY' using errcode='42501'; end if;
  if not private.has_org_role_for_user(p_staff_user_id, null) then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
  select * into v_qr from public.qr_credentials where token_hash=p_token_hash and expires_at>now() and used_at is null for update;
  if not found then raise exception 'QR_EXPIRED_OR_ALREADY_USED' using errcode='22023'; end if;
  if not exists (select 1 from public.user_branch_access uba join public.organization_users ou on ou.id=uba.organization_user_id
    where ou.user_id=p_staff_user_id and ou.organization_id=v_qr.organization_id and ou.status='active' and uba.branch_id=p_branch_id)
    and not exists (select 1 from public.organization_users ou where ou.user_id=p_staff_user_id and ou.organization_id=v_qr.organization_id and ou.status='active' and ou.role in ('owner','manager')) then
    raise exception 'BRANCH_ACCESS_DENIED' using errcode='42501';
  end if;
  if not exists (select 1 from public.memberships ms where ms.member_id=v_qr.member_id and ms.status='active' and ms.starts_at<=now() and ms.ends_at>=now()) then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED' using errcode='42501';
  end if;
  update public.qr_credentials set used_at=now() where token_hash=p_token_hash;
  insert into public.attendance_events(organization_id,branch_id,member_id,event_type,source,recorded_by,idempotency_key)
    values(v_qr.organization_id,p_branch_id,v_qr.member_id,'check_in','gymos_qr',p_staff_user_id,p_token_hash)
    returning id into v_event_id;
  select b.capacity into v_capacity from public.branches b where b.id=p_branch_id;
  select greatest(0,
    (select count(*) from public.attendance_events a where a.branch_id=p_branch_id and a.event_type='check_in' and a.occurred_at::date=current_date)
    - (select count(*) from public.attendance_events a where a.branch_id=p_branch_id and a.event_type='check_out' and a.occurred_at::date=current_date)
  ) into v_inside;
  insert into public.occupancy_snapshots(organization_id,branch_id,inside_count,capacity) values(v_qr.organization_id,p_branch_id,v_inside,v_capacity);
  insert into public.audit_logs(organization_id,branch_id,actor_user_id,action,entity_type,entity_id)
    values(v_qr.organization_id,p_branch_id,p_staff_user_id,'attendance.check_in','attendance_events',v_event_id);
  return v_event_id;
end;
$$;
revoke all on function public.consume_member_qr(text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.consume_member_qr(text,uuid,uuid) to service_role;

-- RLS is enabled on every table in the exposed public schema.
alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_users enable row level security;
alter table public.user_branch_access enable row level security;
alter table public.members enable row level security;
alter table public.member_user_links enable row level security;
alter table public.member_link_codes enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.membership_events enable row level security;
alter table public.attendance_events enable row level security;
alter table public.occupancy_snapshots enable row level security;
alter table public.class_types enable row level security;
alter table public.trainers enable row level security;
alter table public.classes enable row level security;
alter table public.class_bookings enable row level security;
alter table public.inbody_measurements enable row level security;
alter table public.qr_credentials enable row level security;
alter table public.audit_logs enable row level security;

grant select on public.organizations, public.branches, public.organization_users, public.user_branch_access,
  public.members, public.member_user_links, public.membership_plans, public.memberships,
  public.membership_events, public.attendance_events, public.occupancy_snapshots,
  public.class_types, public.trainers, public.classes, public.class_bookings,
  public.inbody_measurements, public.audit_logs to authenticated;
grant insert, update on public.user_profiles to authenticated;
grant insert, update on public.members to authenticated;
grant insert, update on public.memberships to authenticated;
grant insert, update on public.classes to authenticated;
grant insert on public.membership_events to authenticated;
grant insert, update on public.branches, public.organization_users, public.user_branch_access,
  public.membership_plans to authenticated;

create policy "organization members read organization" on public.organizations for select to authenticated
  using (private.has_org_role(id));
create policy "organization users read assigned branches" on public.branches for select to authenticated
  using (private.has_org_role(organization_id));
create policy "managers update branches" on public.branches for update to authenticated
  using (private.has_org_role(organization_id, array['owner','manager'])) with check (private.has_org_role(organization_id, array['owner','manager']));
create policy "users read own profile" on public.user_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy "users update own profile" on public.user_profiles for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "users read own organization assignment" on public.organization_users for select to authenticated
  using (user_id=(select auth.uid()) or private.has_org_role(organization_id, array['owner','manager']));
create policy "owners invite staff" on public.organization_users for insert to authenticated
  with check (private.has_org_role(organization_id, array['owner']));
create policy "owners update staff roles" on public.organization_users for update to authenticated
  using (private.has_org_role(organization_id, array['owner'])) with check (private.has_org_role(organization_id, array['owner']));
create policy "staff read own branch access" on public.user_branch_access for select to authenticated
  using (exists (select 1 from public.organization_users ou where ou.id=organization_user_id and ou.user_id=(select auth.uid()))
    or exists (select 1 from public.organization_users ou where ou.id=organization_user_id and private.has_org_role(ou.organization_id, array['owner','manager'])));
create policy "owners manage branch access" on public.user_branch_access for all to authenticated
  using (exists (select 1 from public.organization_users ou where ou.id=organization_user_id and private.has_org_role(ou.organization_id, array['owner','manager'])))
  with check (exists (select 1 from public.organization_users ou where ou.id=organization_user_id and private.has_org_role(ou.organization_id, array['owner','manager'])));

create policy "staff and linked member read members" on public.members for select to authenticated
  using (private.can_access_branch(organization_id, home_branch_id, array['owner','manager','branch_manager','receptionist','accountant'])
    or private.is_linked_member(organization_id,id));
create policy "permitted staff create members" on public.members for insert to authenticated
  with check (private.can_access_branch(organization_id, home_branch_id, array['owner','manager','branch_manager','receptionist']));
create policy "permitted staff update members" on public.members for update to authenticated
  using (private.can_access_branch(organization_id, home_branch_id, array['owner','manager','branch_manager','receptionist']))
  with check (private.can_access_branch(organization_id, home_branch_id, array['owner','manager','branch_manager','receptionist']));
create policy "users read their member link" on public.member_user_links for select to authenticated
  using (user_id=(select auth.uid()) or private.has_org_role(organization_id, array['owner','manager','branch_manager','receptionist']));

create policy "organization staff read membership plans" on public.membership_plans for select to authenticated using (private.has_org_role(organization_id));
create policy "managers maintain membership plans" on public.membership_plans for all to authenticated
  using (private.has_org_role(organization_id, array['owner','manager'])) with check (private.has_org_role(organization_id, array['owner','manager']));
create policy "staff and member read memberships" on public.memberships for select to authenticated
  using (private.has_org_role(organization_id, array['owner','manager','branch_manager','receptionist','accountant'])
    or private.is_linked_member(organization_id,member_id));
create policy "permitted staff create memberships" on public.memberships for insert to authenticated
  with check (private.can_access_branch(organization_id,branch_id,array['owner','manager','branch_manager','receptionist']));
create policy "managers update memberships" on public.memberships for update to authenticated
  using (private.can_access_branch(organization_id,branch_id,array['owner','manager','branch_manager']))
  with check (private.can_access_branch(organization_id,branch_id,array['owner','manager','branch_manager']));
create policy "staff read membership events" on public.membership_events for select to authenticated
  using (private.has_org_role(organization_id,array['owner','manager','branch_manager','receptionist','accountant']));
create policy "staff append membership events" on public.membership_events for insert to authenticated
  with check (private.has_org_role(organization_id,array['owner','manager','branch_manager','receptionist']));

create policy "staff and member read attendance" on public.attendance_events for select to authenticated
  using (private.can_access_branch(organization_id,branch_id,array['owner','manager','branch_manager','receptionist'])
    or private.is_linked_member(organization_id,member_id));
create policy "staff read occupancy snapshots" on public.occupancy_snapshots for select to authenticated
  using (private.can_access_branch(organization_id,branch_id,array['owner','manager','branch_manager','receptionist']));
create policy "organization staff read class types" on public.class_types for select to authenticated using (private.has_org_role(organization_id));
create policy "organization staff read trainers" on public.trainers for select to authenticated using (private.has_org_role(organization_id));
create policy "organization staff read classes" on public.classes for select to authenticated using (private.has_org_role(organization_id));
create policy "managers maintain classes" on public.classes for all to authenticated
  using (private.can_access_branch(organization_id,branch_id,array['owner','manager','branch_manager']))
  with check (private.can_access_branch(organization_id,branch_id,array['owner','manager','branch_manager']));
create policy "staff and member read bookings" on public.class_bookings for select to authenticated
  using (private.has_org_role(organization_id,array['owner','manager','branch_manager','receptionist','trainer'])
    or private.is_linked_member(organization_id,member_id));
create policy "members read own measurements" on public.inbody_measurements for select to authenticated
  using ((member_visible and private.is_linked_member(organization_id,member_id))
    or private.has_org_role(organization_id,array['owner','manager','nutritionist']));
create policy "nutrition staff add measurements" on public.inbody_measurements for insert to authenticated
  with check (private.has_org_role(organization_id,array['owner','manager','nutritionist']));
create policy "staff read audit logs" on public.audit_logs for select to authenticated
  using (private.has_org_role(organization_id,array['owner','manager']));

-- The bucket is private. Paths are organization_id/member_id/filename.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('inbody-reports','inbody-reports',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false, file_size_limit=10485760, allowed_mime_types=excluded.allowed_mime_types;
create policy "members read visible inbody reports" on storage.objects for select to authenticated
  using (bucket_id='inbody-reports' and exists (
    select 1 from public.inbody_measurements m
    where m.report_path=name and m.member_visible and private.is_linked_member(m.organization_id,m.member_id)
  ));
create policy "authorized staff read inbody reports" on storage.objects for select to authenticated
  using (bucket_id='inbody-reports' and exists (
    select 1 from public.inbody_measurements m
    where m.report_path=name and private.has_org_role(m.organization_id,array['owner','manager','nutritionist'])
  ));
create policy "authorized staff upload inbody reports" on storage.objects for insert to authenticated
  with check (bucket_id='inbody-reports' and exists (
    select 1 from public.members m
    where split_part(name,'/',1)=m.organization_id::text and split_part(name,'/',2)=m.id::text
      and private.has_org_role(m.organization_id,array['owner','manager','nutritionist'])
  ));

-- Only the trusted Edge Function (service_role) can write QR tokens/check-in events.
grant select, insert, update, delete on public.qr_credentials to service_role;
grant insert on public.attendance_events, public.occupancy_snapshots, public.audit_logs to service_role;

do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='attendance_events') then alter publication supabase_realtime add table public.attendance_events; end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='occupancy_snapshots') then alter publication supabase_realtime add table public.occupancy_snapshots; end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='classes') then alter publication supabase_realtime add table public.classes; end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='class_bookings') then alter publication supabase_realtime add table public.class_bookings; end if;
  end if;
end $$;

