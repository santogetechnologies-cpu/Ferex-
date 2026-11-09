async function testRootDomain() {
  try {
    const res = await fetch('https://ferexventures.com/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 149999, currency: 'INR' })
    });
    console.log('Root domain status:', res.status);
    console.log('Root domain body:', await res.text());
  } catch (e) {
    console.log('Root domain error:', e.message);
  }
}
testRootDomain();

