-- Members can see the latest occupancy snapshot for their own home branch.
create policy "linked members read home branch occupancy" on public.occupancy_snapshots
for select to authenticated
using (
  exists (
    select 1 from public.members m
    where m.organization_id = occupancy_snapshots.organization_id
      and m.home_branch_id = occupancy_snapshots.branch_id
      and private.is_linked_member(m.organization_id, m.id)
  )
);
