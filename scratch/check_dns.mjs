import dns from 'node:dns/promises';

async function checkDns() {
  try {
    const cname = await dns.resolveCname('education.ferexventures.com');
    console.log('CNAME:', cname);
  } catch (e) {
    console.log('No CNAME or error:', e.code);
  }
  try {
    const a = await dns.resolve4('education.ferexventures.com');
    console.log('A records:', a);
  } catch (e) {
    console.log('No A records:', e);
  }
}
checkDns();

