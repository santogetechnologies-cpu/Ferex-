import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const testId = '11111111-1111-1111-1111-111111111111';
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('student_documents').insert({
    id: testId,
    student_id: '5177cea5-3f16-4965-800b-87356212a27d',
    file_name: 'test_doc.pdf',
    file_url: 'https://example.com/test.pdf',
    file_size: '1.2 MB',
    doc_type: 'Passport',
    document_type: 'Passport',
    status: 'Submitted',
    uploaded_at: now,
  }).select();

  console.log('Insert with exact columns:', { data, error });

  if (!error) {
    await supabase.from('student_documents').delete().eq('id', testId);
    console.log('Cleaned up test row successfully!');
  }
}

main();

