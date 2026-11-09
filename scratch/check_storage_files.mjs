import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStorage() {
  const { data: list, error } = await supabase.storage.from('student-documents').list('', { limit: 100 });
  console.log('Root files/folders in student-documents bucket:', list, 'error:', error);

  if (list) {
    for (const item of list) {
      if (item.id === null) {
        // Folder
        const { data: sub } = await supabase.storage.from('student-documents').list(item.name, { limit: 100 });
        console.log(`Folder ${item.name}:`, sub);
      }
    }
  }
}
checkStorage();

