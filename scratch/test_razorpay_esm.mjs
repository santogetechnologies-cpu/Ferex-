import Razorpay from 'razorpay';
console.log('Razorpay typeof:', typeof Razorpay);
console.log('Razorpay constructor:', Razorpay);
try {
  const instance = new Razorpay({ key_id: 'test', key_secret: 'test' });
  console.log('Instance created successfully:', !!instance);
} catch (e) {
  console.error('Failed to construct:', e);
}

