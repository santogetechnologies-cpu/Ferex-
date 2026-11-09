import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data: u, error: ue } = await supabase.from('universities').select('*').ilike('country', '%moldova%');
  console.log('Error:', ue);
  console.log('Count:', u ? u.length : 0);
  if (u && u.length > 0) {
    console.log('First:', u[0]);
  }
}
check();
