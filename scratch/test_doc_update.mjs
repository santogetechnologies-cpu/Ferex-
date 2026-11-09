import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpdate() {
  const testId = '00000000-0000-4000-8000-000000000002';
  await supabase.from('student_documents').insert({
    id: testId,
    student_id: '5177cea5-3f16-4965-800b-87356212a27d',
    file_name: 'test2.pdf',
    file_url: 'https://example.com/test2.pdf',
    file_size: '1.2 MB',
    doc_type: 'Passport',
    status: 'Submitted',
    uploaded_at: new Date().toISOString()
  });

  const { error } = await supabase.from('student_documents').update({
    status: 'Verified',
    reviewer_notes: 'Looks good',
    reviewer_id: '5177cea5-3f16-4965-800b-87356212a27d',
    reviewed_at: new Date().toISOString()
  }).eq('id', testId);

  console.log('Update error:', error);
  await supabase.from('student_documents').delete().eq('id', testId);
}
testUpdate();

