import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: users } = await supabase.from('users').select('id, full_name, email, role');
  console.log('Users in DB:', users?.map(u => `${u.role}: ${u.email} (${u.id})`));

  // Check student_documents count
  const { count, error } = await supabase.from('student_documents').select('*', { count: 'exact', head: true });
  console.log('Exact count of student_documents:', { count, error });
}

main();

