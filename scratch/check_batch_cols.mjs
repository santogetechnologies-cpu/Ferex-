import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkBatchCols() {
  const { data, error } = await supabase.from('rimi_batches').select('*').limit(1);
  console.log('rimi_batches query:', data, 'error:', error);
}
checkBatchCols();
