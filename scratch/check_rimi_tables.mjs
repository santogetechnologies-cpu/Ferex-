import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'rimi_customers',
  'rimi_customer_activity',
  'rimi_products',
  'rimi_batches',
  'rimi_sales_orders',
  'rimi_order_items',
  'rimi_payments',
  'rimi_warehouses',
  'rimi_tasks',
  'rimi_vehicles',
  'rimi_notifications'
];

async function checkTables() {
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table ${t}: ${error ? 'ERROR: ' + error.message : 'OK (rows: ' + (data?.length || 0) + ')'}`);
  }
}
checkTables();

