async function testBrowserHeaders() {
  const headers = {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://education.ferexventures.com',
    'Referer': 'https://education.ferexventures.com/student/payments',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  };

  const res = await fetch('https://education.ferexventures.com/api/create-order', {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount: 149999, currency: 'INR' })
  });

  console.log('Status:', res.status);
  console.log('Response Headers:', Object.fromEntries(res.headers.entries()));
  console.log('Response Body:', await res.text());
}
testBrowserHeaders();

