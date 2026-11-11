import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Content-Type': 'application/json',
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const centralRoles = ['central', 'superadmin', 'super_admin'];
const educationRoles = ['admin', 'education_admin', 'education'];

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return reply({});
  if (req.method !== 'POST') return reply({ error: 'POST required' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const {
      data: { user: callerUser },
      error: authError,
    } = await caller.auth.getUser();

    if (authError || !callerUser) {
      return reply({ error: 'Sign in required' }, 401);
    }

    const { data: role, error: roleError } = await caller.rpc('get_auth_user_role');
    const isCentral = !roleError && centralRoles.includes(role);
    const isEducation = !roleError && educationRoles.includes(role);

    if (!isCentral && !isEducation) {
      return reply({ error: 'Administrator access required to delete accounts' }, 403);
    }

    const body = await req.json();
    const targetUserId = body.user_id || body.id;
    const targetEmail = body.email ? String(body.email).toLowerCase().trim() : '';

    if (!targetUserId && !targetEmail) {
      return reply({ error: 'A valid user_id or email is required' }, 400);
    }

    if (
      (targetUserId && targetUserId === callerUser.id) ||
      (targetEmail && targetEmail === callerUser.email?.toLowerCase())
    ) {
      return reply({ error: 'You cannot delete your own active administrator account' }, 400);
    }

    const db = createClient(url, serviceRoleKey);

    // Call database deletion RPC
    const { data: rpcData, error: rpcError } = await db.rpc('delete_user_by_admin', {
      target_user_id: targetUserId || null,
      target_email: targetEmail || null,
    });

    if (rpcError) {
      console.warn('RPC delete_user_by_admin error:', rpcError);
      return reply({ error: rpcError.message || 'Database deletion error' }, 400);
    }

    // Double check auth delete if user_id is provided
    if (targetUserId) {
      await db.auth.admin.deleteUser(targetUserId).catch(() => {});
    }

    return reply({
      success: true,
      message: 'Account permanently deleted from authentication and directory',
      data: rpcData,
    });
  } catch (err: any) {
    console.error('delete-user error:', err);
    return reply({ error: err?.message || 'Failed to delete user' }, 500);
  }
});
