import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)?.[1]?.trim();
const supabase = createClient(url, key);

async function testProjectSync() {
  console.log('Testing project insert via anon key (Digital Manager simulation)...');
  const testId = '44444444-4444-4444-4444-444444444444';
  const newProject = {
    id: testId,
    title: 'Automated Manager Sync Test Project',
    client_name: 'Ferex Enterprise Test Client',
    client_type: 'Internal',
    service_category: 'Web & App Development',
    scope: 'Testing manager to admin real-time sync',
    budget: 350000,
    status: 'Briefing',
    assigned_staff_name: 'Digital Project Manager',
    assigned_staff_email: 'digimanager@ferex.com',
    created_by: 'Digital Project Manager'
  };

  const { data: insData, error: insErr } = await supabase.from('digital_projects').insert(newProject).select();
  if (insErr) {
    console.error('FAIL insert:', insErr);
    return;
  }
  console.log('PASS insert project:', insData);

  console.log('Testing project fetch via anon key (Digital Admin simulation)...');
  const { data: fetchProjects, error: fetchErr } = await supabase.from('digital_projects').select('*').eq('id', testId);
  if (fetchErr) {
    console.error('FAIL fetch:', fetchErr);
    return;
  }
  console.log('PASS fetch project as Admin:', fetchProjects);

  // Clean up
  const { error: delErr } = await supabase.from('digital_projects').delete().eq('id', testId);
  console.log('Cleaned up test project:', delErr ? delErr.message : 'SUCCESS');
}

testProjectSync();
