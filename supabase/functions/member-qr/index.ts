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
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: link } = await admin.from('member_user_links').select('organization_id,member_id').eq('user_id', userData.user.id).is('revoked_at', null).maybeSingle();
  if (!link) return reply(403, { error: 'MEMBER_ACCOUNT_NOT_LINKED' });
  const { data: membership } = await admin.from('memberships').select('id').eq('member_id', link.member_id).eq('status', 'active').lte('starts_at', new Date().toISOString()).gte('ends_at', new Date().toISOString()).limit(1).maybeSingle();
  if (!membership) return reply(403, { error: 'ACTIVE_MEMBERSHIP_REQUIRED' });

  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const expiresAt = new Date(Date.now() + 30_000).toISOString();
  const { error } = await admin.from('qr_credentials').insert({ organization_id: link.organization_id, member_id: link.member_id, token_hash: await hash(token), expires_at: expiresAt });
  if (error) return reply(500, { error: 'QR_CREATE_FAILED' });
  return reply(200, { qr: `GYMOS1:${token}`, expires_at: expiresAt });
});
