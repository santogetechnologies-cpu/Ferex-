import { supabase } from '../supabase';

export interface SessionRevocationPayload {
  userId?: string;
  email?: string;
  action: 'delete' | 'deactivate' | 'role_change' | 'permissions_change';
  newRole?: string;
  permissions?: any[];
  message?: string;
}

const REVOCATION_CHANNEL_NAME = 'ferex_session_revocation';

/**
 * Broadcasts a real-time account revocation or role change signal to all active clients.
 * When an affected client receives this event, their session is immediately terminated
 * or their role permissions are updated on-the-fly without requiring a manual refresh.
 */
export async function broadcastSessionRevocation(payload: SessionRevocationPayload): Promise<void> {
  try {
    const channel = supabase.channel(REVOCATION_CHANNEL_NAME);
    await channel.send({
      type: 'broadcast',
      event: 'session_revoked',
      payload: {
        userId: payload.userId,
        email: payload.email ? payload.email.toLowerCase().trim() : undefined,
        action: payload.action,
        newRole: payload.newRole,
        permissions: payload.permissions,
        message: payload.message || (
          payload.action === 'deactivate' || payload.action === 'delete'
            ? 'Your account has been deactivated or deleted. Please contact the Central Admin.'
            : undefined
        ),
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('[broadcastSessionRevocation notice]:', err);
  }
}

/**
 * Deactivates a user account on backend and broadcasts immediate real-time session termination.
 */
export async function deactivateUserAccount(
  userId: string,
  email?: string,
  reason: string = 'Your account has been deactivated or deleted. Please contact the Central Admin.'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try secure RPC function set_user_status_by_admin
    const { data, error } = await supabase.rpc('set_user_status_by_admin', {
      target_user_id: userId,
      new_is_active: false,
      new_status: 'inactive',
    });

    if (error) {
      // Fallback: direct update on public.users
      const { error: updateErr } = await supabase
        .from('users')
        .update({ is_active: false, status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateErr) throw updateErr;
    }

    // 2. Broadcast real-time session revocation so user is logged out immediately without refresh
    await broadcastSessionRevocation({
      userId,
      email,
      action: 'deactivate',
      message: reason,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to deactivate account' };
  }
}

/**
 * Updates a user's role on backend and broadcasts immediate permission revocation/redirect.
 */
export async function updateUserRoleWithRealtime(
  userId: string,
  newRole: string,
  email?: string,
  permissions?: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('set_user_status_by_admin', {
      target_user_id: userId,
      new_role: newRole,
      new_permissions: permissions || null,
    });

    if (error) {
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          role: newRole,
          permissions: permissions || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateErr) throw updateErr;
    }

    // Broadcast role change immediately
    await broadcastSessionRevocation({
      userId,
      email,
      action: 'role_change',
      newRole,
      permissions,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update user role' };
  }
}

