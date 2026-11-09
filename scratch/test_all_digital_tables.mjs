import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'digital_clients',
  'digital_projects',
  'digital_tasks',
  'digital_invoices',
  'digital_payments',
  'digital_leads',
  'digital_staff',
  'digital_meetings',
  'digital_milestones',
  'digital_deliverables',
  'digital_expenses',
  'digital_tickets',
  'digital_sprints'
];

for (const t of tables) {
  const { data, error } = await supabase.from(t).select('*').limit(1);
  if (error) {
    console.log(`❌ ${t}: [${error.code}] ${error.message}`);
  } else {
    console.log(`✅ ${t}: OK (count: ${data.length})`);
  }
}

