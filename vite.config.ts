import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createOrder, verifyPayment } from './server/razorpay.ts';

function razorpayDevApiPlugin(): Plugin {
  const handleApi = (req: any, res: any, next: any) => {
    const url = req.url ? req.url.split('?')[0] : '';

    if (url === '/api/create-order' && req.method === 'POST') {
      let raw = '';
      req.on('data', (chunk: any) => {
        raw += chunk;
      });
      req.on('end', async () => {
        try {
          const body = raw ? JSON.parse(raw) : {};
          const result = await createOrder(body);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Server error' }));
        }
      });
      return;
    }

    if (url === '/api/verify-payment' && req.method === 'POST') {
      let raw = '';
      req.on('data', (chunk: any) => {
        raw += chunk;
      });
      req.on('end', async () => {
        try {
          const body = raw ? JSON.parse(raw) : {};
          const result = verifyPayment(body);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Server error' }));
        }
      });
      return;
    }

    next();
  };

  return {
    name: 'razorpay-dev-api',
    configureServer(server) {
      server.middlewares.use(handleApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApi);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), razorpayDevApiPlugin()],
  server: {
    host: true,
  },
});
