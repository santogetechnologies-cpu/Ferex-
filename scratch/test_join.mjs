import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('student_documents')
    .select('*, users:student_id(id, full_name, email, phone)');

  console.log('Join query result:', { data, error });
}

main();

