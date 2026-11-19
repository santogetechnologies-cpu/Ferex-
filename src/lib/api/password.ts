import { supabase } from '../supabase';
import { sendPasswordChangedEmail } from './email';

/** One password rule for every screen: at least 8 characters with a lower-case letter, an upper-case letter and a digit. */
export function passwordProblem(pwd: string): string | null {
  if (!pwd || pwd.length < 8) return 'Use at least 8 characters.';
  if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd)) return 'Use both upper-case and lower-case letters.';
  if (!/[0-9]/.test(pwd)) return 'Include at least one number.';
  return null;
}

/**
 * Changes the signed-in person's password. The current password must be right (so a borrowed session cannot take over the
 * account), other devices are signed out, and an email tells the owner it happened.
 */
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  const problem = passwordProblem(newPassword);
  if (problem) throw new Error(problem);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Sign in again to change your password.');
  if (!currentPassword) throw new Error('Enter your current password.');
  if (currentPassword === newPassword) throw new Error('Choose a password different from the current one.');
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (check.error) throw new Error('Your current password is not correct.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  await supabase.auth.signOut({ scope: 'others' }).catch(() => undefined);
  void sendPasswordChangedEmail(user.email, (user.user_metadata as any)?.full_name || '').catch(() => undefined);
  try { await supabase.from('users').update({ must_change_password: false, updated_at: new Date().toISOString() }).eq('id', user.id); } catch { /* the flag is advisory */ }
}

/** Sets a new password from a reset-email link (the link signs the person in for this one purpose). */
export async function completePasswordReset(newPassword: string): Promise<void> {
  const problem = passwordProblem(newPassword);
  if (problem) throw new Error(problem);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('This reset link is no longer valid. Request a new one from the sign-in page.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  if (user.email) void sendPasswordChangedEmail(user.email, (user.user_metadata as any)?.full_name || '').catch(() => undefined);
  try { await supabase.from('users').update({ must_change_password: false, updated_at: new Date().toISOString() }).eq('id', user.id); } catch { /* advisory */ }
  // Everything else signs in again with the new password.
  await supabase.auth.signOut({ scope: 'global' }).catch(() => undefined);
}
