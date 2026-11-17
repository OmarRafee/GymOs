import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders, getBearer, hash, reply } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bearer = getBearer(req);
  if (!url || !anonKey || !serviceKey || !bearer) return reply(401, { error: 'AUTH_REQUIRED' });
  const auth = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } });
  const { data: userData } = await auth.auth.getUser();
  if (!userData.user) return reply(401, { error: 'AUTH_REQUIRED' });
  const body = await req.json().catch(() => ({}));
  if (typeof body.qr !== 'string' || typeof body.branch_id !== 'string') return reply(400, { error: 'QR_AND_BRANCH_REQUIRED' });
  const prefix = 'GYMOS1:';
  if (!body.qr.startsWith(prefix) || body.qr.length > 128) return reply(400, { error: 'QR_INVALID' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('consume_member_qr', {
    p_token_hash: await hash(body.qr.slice(prefix.length)),
    p_branch_id: body.branch_id,
    p_staff_user_id: userData.user.id,
  });
  if (error) {
    const safeErrors: Record<string,string> = {
      QR_EXPIRED_OR_ALREADY_USED: 'QR_EXPIRED_OR_USED',
      ACTIVE_MEMBERSHIP_REQUIRED: 'ACTIVE_MEMBERSHIP_REQUIRED',
      BRANCH_ACCESS_DENIED: 'BRANCH_ACCESS_DENIED',
      STAFF_REQUIRED: 'STAFF_PERMISSION_REQUIRED',
    };
    const safe = Object.keys(safeErrors).find((code) => error.message.includes(code));
    return reply(400, { error: safe ? safeErrors[safe] : 'CHECK_IN_FAILED' });
  }
  return reply(200, { attendance_event_id: data, checked_in: true });
});
