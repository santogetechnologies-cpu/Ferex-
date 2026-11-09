async function testVariations() {
  const urls = [
    'https://education.ferexventures.com/api/create-order',
    'https://education.ferexventures.com/api/create-order/',
    'https://education.ferexventures.com/api/verify-payment',
    'https://education.ferexventures.com/api/verify-payment/'
  ];

  for (const u of urls) {
    const postRes = await fetch(u, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 10000, currency: 'INR' })
    });
    console.log(`POST ${u} => ${postRes.status} (type: ${postRes.headers.get('content-type')})`);

    const optRes = await fetch(u, {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Method': 'POST' }
    });
    console.log(`OPTIONS ${u} => ${optRes.status}`);
  }
}
testVariations();

