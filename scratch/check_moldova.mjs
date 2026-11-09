import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function matchesDegreeLevel(prog, degree) {
  if (!degree) return true;
  const dNorm = degree.toLowerCase().trim();
  const isBach = dNorm.includes('bachelor') || /\b(ba|b\.a|bsc|b\.sc|beng|bba|btech|undergrad|undergraduate)\b/i.test(dNorm);
  const isMast = dNorm.includes('master') || /\b(ma|m\.a|msc|m\.sc|meng|mba|mtech|postgrad|postgraduate)\b/i.test(dNorm);
  const isDoc = dNorm.includes('doctor') || dNorm.includes('phd');
  const isDip = dNorm.includes('diploma') || dNorm.includes('certificate') || dNorm.includes('foundation') || dNorm.includes('pathway');

  const pLevel = ((typeof prog === 'string' ? '' : (prog?.degree_level || prog?.degree)) || '').toLowerCase().trim();
  const pName = ((typeof prog === 'string' ? prog : prog?.name) || '').toLowerCase().trim();
  const pCategory = ((typeof prog === 'string' ? '' : prog?.category) || '').toLowerCase().trim();
  const combined = `${pLevel} ${pName} ${pCategory}`;

  const hasMasterKeywords = /\b(master|masters|msc|m\.sc|ma|m\.a|meng|m\.eng|mba|magister|postgrad|postgraduate)\b/i.test(combined);
  const hasBachelorKeywords = /\b(bachelor|bachelors|bsc|b\.sc|ba|b\.a|beng|b\.eng|bba|b\.tech|licencjat|inżynier|undergrad|undergraduate)\b/i.test(combined);
  const hasDoctorKeywords = /\b(phd|doctor|doctorate|doctoral)\b/i.test(combined);
  const hasDiplomaKeywords = /\b(diploma|certificate|foundation|pathway)\b/i.test(combined);
  const isIntegrated = combined.includes('integrated') || pLevel.includes('integrated');

  if (isBach) {
    if (pLevel.includes('master') || pLevel.includes('postgrad') || pLevel.includes('phd') || pLevel.includes('doctor')) {
      return false;
    }
    if (hasMasterKeywords || hasDoctorKeywords) {
      return false;
    }
    if (pLevel.includes('bachelor') || pLevel.includes('undergrad') || isIntegrated) {
      return true;
    }
    if (hasBachelorKeywords || isIntegrated) {
      return true;
    }
    return !pLevel && !hasMasterKeywords && !hasDoctorKeywords && !hasDiplomaKeywords;
  }

  if (isMast) {
    if (pLevel.includes('bachelor') || pLevel.includes('undergrad') || pLevel.includes('licencjat')) {
      if (!isIntegrated) return false;
    }
    if (hasBachelorKeywords && !hasMasterKeywords && !isIntegrated) {
      return false;
    }
    if (pLevel.includes('master') || pLevel.includes('postgrad') || isIntegrated) {
      return true;
    }
    if (hasMasterKeywords || isIntegrated) {
      return true;
    }
    return false;
  }

  return true;
}

async function check() {
  const tables = ['system_config', 'digital_projects', 'digital_clients', 'digital_tasks', 'tasks', 'users', 'universities', 'destinations', 'applications', 'notifications'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(2);
    console.log(`Table [${t}]:`, error ? `ERROR: ${error.code} - ${error.message}` : `OK (${data?.length} rows)`);
  }
}
check();
