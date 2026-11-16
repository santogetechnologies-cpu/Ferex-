// Supabase Edge Function: purge-not-interested-leads
// Deploy: supabase functions deploy purge-not-interested-leads
// Schedule via Supabase Dashboard -> Edge Functions -> Schedules (e.g. hourly: "0 * * * *")
//
// Required secrets (supabase secrets set KEY=value):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // 1. Primary: execute the database procedure
    const { data, error } = await supabase.rpc('delete_expired_not_interested_leads');

    if (!error) {
      return new Response(JSON.stringify({ success: true, deleted: data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Direct fallback query with service role key if RPC not yet created
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: directDeleted, error: directError } = await supabase
      .from('education_leads')
      .delete()
      .eq('status', 'Not Interested')
      .not('not_interested_at', 'is', null)
      .lte('not_interested_at', fourteenDaysAgo)
      .is('converted_student_id', null)
      .select('id');

    if (directError) {
      return new Response(JSON.stringify({ error: directError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, deleted: directDeleted?.length || 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
