import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('student_documents').select('*');
  console.log('student_documents table result:', { count: data?.length, data: data?.slice(0, 3), error });

  const { data: catData, error: catError } = await supabase.from('system_config').select('*').eq('key', 'ferex_documents_catalog');
  console.log('system_config documents catalog result:', { catData, catError });
}

main();

