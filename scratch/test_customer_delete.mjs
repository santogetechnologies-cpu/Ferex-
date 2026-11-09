import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: custs } = await supabase.from('rimi_customers').select('id, business_name').limit(5);
  console.log('Sample Rimi customers:', custs);

  if (custs && custs.length > 0) {
    const target = custs[0];
    console.log('Testing delete on:', target);
    // Let's test what error delete gives
    const { error } = await supabase.from('rimi_customers').delete().eq('id', target.id);
    console.log('Delete error result:', error);
  }
}

main();

