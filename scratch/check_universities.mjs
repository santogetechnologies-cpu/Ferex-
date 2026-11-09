import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)?.[1]?.trim();
const client = createClient(url, key);

async function main() {
  const { data, error } = await client.from('universities').select('id, name, country, city, programs, course_programs');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Universities count:', data.length);
    data.forEach(u => {
      console.log(`- [${u.id}] ${u.name} (${u.country}, ${u.city}) - Courses: ${u.course_programs ? u.course_programs.length : 0}`);
    });
  }
}

main();

