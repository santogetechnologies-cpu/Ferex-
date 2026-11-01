import { supabase } from './supabase';

/** Uses only the caller's authenticated session and database permissions. */
export async function getAdminSupabaseClient() { return supabase; }
