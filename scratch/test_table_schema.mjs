import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  // Try inserting a dummy document to see column errors
  const testId = '00000000-0000-0000-0000-000000000001';
  const { data, error } = await supabase.from('student_documents').insert({
    id: testId,
    file_name: 'test.pdf',
    file_url: 'https://example.com/test.pdf'
  }).select();

  console.log('Insert test result:', { data, error });

  if (!error) {
    // clean up
    await supabase.from('student_documents').delete().eq('id', testId);
  }
}

main();

