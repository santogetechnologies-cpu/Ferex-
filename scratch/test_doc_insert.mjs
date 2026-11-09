import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInsert() {
  const testId = '00000000-0000-4000-8000-000000000001';
  const { error } = await supabase.from('student_documents').insert({
    id: testId,
    student_id: '5177cea5-3f16-4965-800b-87356212a27d',
    file_name: 'test.pdf',
    file_url: 'https://example.com/test.pdf',
    file_size: '1.2 MB',
    doc_type: 'Passport',
    status: 'Submitted',
    uploaded_at: new Date().toISOString()
  });
  console.log('Insert error:', error);
  if (!error) {
    console.log('Insert succeeded! Deleting test row...');
    await supabase.from('student_documents').delete().eq('id', testId);
  }
}
testInsert();

