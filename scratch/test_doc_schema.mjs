import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSchema() {
  const { data, error } = await supabase.from('student_documents').select('*').limit(1);
  console.log('Error:', error);
  console.log('Sample row:', data);
}
testSchema();

