import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const centralRoles = ['central', 'superadmin', 'super_admin'];
const educationRoles = ['admin', 'education_admin', 'education'];
const supportedRoles = [...centralRoles, ...educationRoles, 'student', 'staff', 'counselor', 'digital', 'digital_admin', 'ferex_digital', 'digital_director', 'digital_manager', 'project_manager', 'pm', 'digimanager', 'account_manager', 'digital_staff', 'designer', 'developer', 'trade', 'trade_admin', 'global_trade', 'logistics_officer', 'rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager'];
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return reply({});
  if (req.method !== 'POST') return reply({ error: 'POST required' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return reply({ error: 'Sign in required' }, 401);
    const { data: role, error: roleError } = await caller.rpc('get_auth_user_role');
    if (roleError || ![...centralRoles, ...educationRoles].includes(role)) return reply({ error: 'Administrator access required' }, 403);
    const body = await req.json();
    if (!supportedRoles.includes(body.role) || (!centralRoles.includes(role) && !['student', 'staff', 'counselor'].includes(body.role))) return reply({ error: 'You cannot provision this role' }, 403);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !String(body.full_name || '').trim()) return reply({ error: 'A valid name and email are required' }, 400);
    if (body.password && (typeof body.password !== 'string' || body.password.length < 8)) return reply({ error: 'Password must contain at least 8 characters' }, 400);
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await db.auth.admin.createUser({ email, password: body.password || crypto.randomUUID() + crypto.randomUUID(), email_confirm: true,
      app_metadata: { role: body.role }, user_metadata: { full_name: body.full_name.trim(), department: body.department || 'Education', phone: body.phone || '' } });
    if (error) return reply({ error: error.message }, 400);
    const { data: profile, error: profileError } = await db.from('users').update({ role: body.role, full_name: body.full_name.trim(), department: body.department || 'Education', phone: body.phone || '',
      ...(Array.isArray(body.permissions) ? { permissions: body.permissions } : {}),
      ...(body.assigned_counselor ? { assigned_counselor: body.assigned_counselor } : {}),
      ...(body.country ? { country: body.country } : {}), must_change_password: true }).eq('id', data.user.id).select().single();
    if (profileError) { await db.auth.admin.deleteUser(data.user.id); return reply({ error: 'Profile creation failed. No account was provisioned.' }, 400); }
    return reply({ user: profile });
  } catch (error) {
    console.error('Account provisioning failed:', error instanceof Error ? error.message : 'Unknown error');
    return reply({ error: 'Account provisioning failed' }, 500);
  }
});
