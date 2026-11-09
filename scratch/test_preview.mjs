async function testPreview() {
  const res = await fetch('https://ferex-c9wn-40n8udgv4-santogetechnologies-8926s-projects.vercel.app/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 10000, currency: 'INR' })
  });
  console.log('Preview Status:', res.status);
  console.log('Preview Body:', await res.text());
}
testPreview();

