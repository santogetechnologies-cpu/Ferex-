async function testFull() {
  const res = await fetch('https://education.ferexventures.com/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 149999, currency: 'INR' })
  });
  console.log('Status:', res.status);
  console.log('Data:', await res.json());
}
testFull();

