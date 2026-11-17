import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders, getBearer, hash, randomCode, reply } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bearer = getBearer(req);
  if (!url || !anonKey || !serviceKey || !bearer) return reply(401, { error: 'AUTH_REQUIRED' });

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } });
  const { data: userData } = await caller.auth.getUser();
  if (!userData.user) return reply(401, { error: 'AUTH_REQUIRED' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const input = await req.json().catch(() => ({}));
  if (typeof input.member_id !== 'string') return reply(400, { error: 'MEMBER_ID_REQUIRED' });

  const { data: member } = await admin.from('members').select('id,organization_id,home_branch_id').eq('id', input.member_id).maybeSingle();
  if (!member) return reply(404, { error: 'MEMBER_NOT_FOUND' });
  const { data: staff } = await admin.from('organization_users').select('id,role,status').eq('organization_id', member.organization_id).eq('user_id', userData.user.id).eq('status', 'active').maybeSingle();
  if (!staff || !['owner','manager','branch_manager','receptionist'].includes(staff.role)) return reply(403, { error: 'STAFF_PERMISSION_REQUIRED' });
  if (!['owner','manager'].includes(staff.role) && member.home_branch_id) {
    const { data: branchAccess } = await admin.from('user_branch_access').select('id').eq('organization_user_id', staff.id).eq('branch_id', member.home_branch_id).maybeSingle();
    if (!branchAccess) return reply(403, { error: 'BRANCH_ACCESS_REQUIRED' });
  }

  const code = randomCode();
  const { error } = await admin.from('member_link_codes').insert({
    organization_id: member.organization_id,
    member_id: member.id,
    code_hash: await hash(code),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_by: userData.user.id,
  });
  if (error) return reply(500, { error: 'LINK_CODE_CREATE_FAILED' });
  return reply(200, { code, expires_in_seconds: 900 });
});
