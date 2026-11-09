async function testHealth() {
  const res = await fetch('https://education.ferexventures.com/api/health');
  console.log('Health Status:', res.status);
  console.log('Headers:', [...res.headers.entries()]);
  console.log('Body:', await res.text());
}
testHealth();

