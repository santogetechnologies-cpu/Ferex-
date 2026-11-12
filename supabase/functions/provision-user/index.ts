import { createClient } from 'npm:@supabase/supabase-js@2';
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
    const allowedCallers = [...centralRoles, ...educationRoles, 'counselor', 'staff'];
    if (roleError || !allowedCallers.includes(role)) return reply({ error: 'Administrator access required' }, 403);
    const body = await req.json();
    if (!supportedRoles.includes(body.role) || (!centralRoles.includes(role) && !['student', 'staff', 'counselor'].includes(body.role))) return reply({ error: 'You cannot provision this role' }, 403);
    if (['counselor', 'staff'].includes(role) && body.role !== 'student') return reply({ error: 'Admissions counselors can only provision student accounts' }, 403);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !String(body.full_name || '').trim()) return reply({ error: 'A valid name and email are required' }, 400);
    if (body.password && (typeof body.password !== 'string' || body.password.length < 8)) return reply({ error: 'Password must contain at least 8 characters' }, 400);
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // A login left behind by an earlier delete (no profile row) must not block re-creating the same email.
    // An email that still has a profile is a genuine duplicate and is rejected below.
    const { error: purgeError } = await db.rpc('purge_orphan_auth_user', { p_email: email });
    if (purgeError) console.error('Orphan login cleanup failed:', purgeError.message);
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: body.password || crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
      app_metadata: { role: body.role },
      user_metadata: {
        role: body.role,
        full_name: body.full_name.trim(),
        department: body.department || 'Education',
        phone: body.phone || '',
      },
    });
    if (error) return reply({ error: /already|registered|exists/i.test(error.message) ? 'An account with this email already exists.' : error.message }, 400);

    // Give handle_new_user trigger a brief moment or upsert profile directly
    let profile = null;
    let profileError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await db.from('users').upsert({
        id: data.user.id,
        email,
        role: body.role,
        full_name: body.full_name.trim(),
        department: body.department || 'Education',
        phone: body.phone || '',
        ...(Array.isArray(body.permissions) ? { permissions: body.permissions } : {}),
        ...(body.assigned_counselor ? { assigned_counselor: body.assigned_counselor } : {}),
        ...(body.country ? { country: body.country } : {}),
        must_change_password: true,
        updated_at: new Date().toISOString(),
      }).select().single();

      if (!res.error) {
        profile = res.data;
        profileError = null;
        break;
      }
      profileError = res.error;
      await new Promise(r => setTimeout(r, 200));
    }

    if (profileError || !profile) {
      await db.auth.admin.deleteUser(data.user.id);
      return reply({ error: 'Profile creation failed. No account was provisioned.' }, 400);
    }
    return reply({ user: profile });
  } catch (error) {
    console.error('Account provisioning failed:', error instanceof Error ? error.message : 'Unknown error');
    return reply({ error: 'Account provisioning failed' }, 500);
  }
});
