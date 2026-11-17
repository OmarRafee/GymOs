-- Synthetic pilot configuration only. No member or authentication data is seeded.
insert into public.organizations(id,name,slug,timezone,currency)
values('10000000-0000-4000-8000-000000000001','GymOS Pilot Club','gymos-pilot','Africa/Cairo','EGP')
on conflict (slug) do nothing;

insert into public.branches(id,organization_id,name,code,address,capacity)
values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Downtown Club','DOWNTOWN','Cairo',200)
on conflict (organization_id,code) do nothing;

insert into public.membership_plans(id,organization_id,name,description,duration_days,price_minor,currency)
values
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Monthly Flex','One month of gym access.',30,0,'EGP'),
  ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Quarterly','Three months of gym access.',90,0,'EGP'),
  ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Annual','Twelve months of gym access.',365,0,'EGP')
on conflict (organization_id,name) do nothing;

insert into public.trainers(id,organization_id,branch_id,display_name,specialties,status)
values
  ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Mina Demo',array['Strength'],'active'),
  ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Nadia Demo',array['Yoga'],'active')
on conflict (id) do nothing;

insert into public.members(id,organization_id,home_branch_id,member_number,first_name,last_name,email,status,joined_at)
values
  ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','DEMO-0001','Demo','Member','demo.member@example.test','active',now()-interval '30 days'),
  ('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','DEMO-0002','Sample','Member','sample.member@example.test','active',now()-interval '75 days'),
  ('60000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','DEMO-0003','Trial','Member','trial.member@example.test','inactive',now()-interval '150 days')
on conflict (id) do nothing;

insert into public.memberships(id,organization_id,member_id,plan_id,branch_id,starts_at,ends_at,status)
values
  ('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now()-interval '3 days',now()+interval '27 days','active'),
  ('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',now()-interval '60 days',now()+interval '30 days','active'),
  ('70000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now()-interval '120 days',now()-interval '90 days','expired')
on conflict (id) do nothing;

insert into public.membership_events(id,organization_id,membership_id,event_type,occurred_at,reason)
values
  ('80000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','activated',now()-interval '3 days','Synthetic demo seed'),
  ('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','activated',now()-interval '60 days','Synthetic demo seed'),
  ('80000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000003','expired',now()-interval '90 days','Synthetic demo seed')
on conflict (id) do nothing;

insert into public.classes(id,organization_id,branch_id,class_type_id,trainer_id,title,starts_at,ends_at,capacity,booking_opens_at,booking_closes_at)
values
  ('90000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Strength & Conditioning',date_trunc('day',now())+interval '1 day 9 hours',date_trunc('day',now())+interval '1 day 9 hours 50 minutes',16,now(),date_trunc('day',now())+interval '1 day 8 hours'),
  ('90000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002','Yoga Reset',date_trunc('day',now())+interval '1 day 11 hours',date_trunc('day',now())+interval '1 day 12 hours',14,now(),date_trunc('day',now())+interval '1 day 10 hours')
on conflict (id) do nothing;

insert into public.attendance_events(id,organization_id,branch_id,member_id,event_type,occurred_at,source,idempotency_key,metadata)
values
  ('a0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','check_in',now()-interval '2 hours','import','demo-seed:attendance:1','{"synthetic":true}'::jsonb),
  ('a0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','check_in',now()-interval '1 day','import','demo-seed:attendance:2','{"synthetic":true}'::jsonb),
  ('a0000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','check_in',now()-interval '2 days','import','demo-seed:attendance:3','{"synthetic":true}'::jsonb),
  ('a0000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','check_in',now()-interval '3 days','import','demo-seed:attendance:4','{"synthetic":true}'::jsonb),
  ('a0000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','check_in',now()-interval '4 days','import','demo-seed:attendance:5','{"synthetic":true}'::jsonb)
on conflict (id) do nothing;

insert into public.occupancy_snapshots(id,organization_id,branch_id,captured_at,inside_count,capacity)
values('b0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now(),2,200)
on conflict (id) do nothing;

insert into public.class_types(id,organization_id,name,description,default_duration_minutes,color)
values
  ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Strength','Strength and conditioning. ',50,'#c8f169'),
  ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Yoga','Mobility and recovery.',60,'#d8c9ef'),
  ('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Cycling','Indoor cycling class.',45,'#f0b08e')
on conflict (organization_id,name) do nothing;

