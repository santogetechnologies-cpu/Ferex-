async function testDualMode() {
  const mod = await import('../api/create-order.js');

  console.log('Testing Node (req, res) mode:');
  const reqNode = { method: 'POST', body: { amount: 149999, currency: 'INR' } };
  const resNode = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(d) { console.log('Node JSON Response:', this.statusCode, d); }
  };
  await mod.default(reqNode, resNode);

  console.log('Testing Web Standard (Request) mode:');
  const reqWeb = new Request('https://example.com/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 149999, currency: 'INR' })
  });
  const resWeb = await mod.default(reqWeb);
  console.log('Web Response Status:', resWeb.status);
  console.log('Web Response Body:', await resWeb.json());
}
testDualMode();

