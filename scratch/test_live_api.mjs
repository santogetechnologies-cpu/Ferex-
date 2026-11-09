async function test() {
  try {
    const res = await fetch('https://education.ferexventures.com/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 10000, currency: 'INR' })
    });
    console.log('Status:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    console.log('Body:', await res.text());
  } catch (err) {
    console.error('Error:', err);
  }
}
test();

