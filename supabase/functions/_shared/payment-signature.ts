export async function verifyPaymentSignature(input: { body: string; header: string; secret: string; provider: 'stripe' | 'razorpay'; nowSeconds?: number }) {
  if (!input.secret) return false;
  let message = input.body;
  let signatures = [input.header];
  if (input.provider === 'stripe') {
    const fields = input.header.split(',').map(p => p.trim().split('='));
    const timestamp = fields.find(([key]) => key === 't')?.[1];
    if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs((input.nowSeconds ?? Date.now() / 1000) - Number(timestamp)) > 300) return false;
    message = `${timestamp}.${input.body}`;
    signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value);
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(input.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  for (const signature of signatures) {
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) continue;
    const bytes = Uint8Array.from(signature.match(/../g)!, hex => parseInt(hex, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(message))) return true;
  }
  return false;
}
