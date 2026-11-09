import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  console.log('Storage buckets list:', { buckets, error });

  // Try listing files in student-documents
  const { data: files, error: listError } = await supabase.storage.from('student-documents').list();
  console.log('Files in student-documents bucket:', { files, listError });
}

main();

