async function main() {
  try {
    const mod = await import('../api/create-order.ts');
    console.log('Successfully imported api/create-order.ts:', mod);
    // Fake req and res
    const req = {
      method: 'POST',
      body: { amount: 10000, currency: 'INR' }
    };
    const res = {
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      data: null,
      json(d) { this.data = d; console.log('Response:', this.statusCode, d); },
      end() { console.log('Ended'); }
    };
    await mod.default(req, res);
  } catch (err) {
    console.error('Import or execution failed:', err);
  }
}
main();

