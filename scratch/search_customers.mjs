import fs from 'node:fs';

const content = fs.readFileSync('src/pages/rimi/RimiCustomers.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('dossier') || l.includes('selectedCustomer') || l.includes('customerOrders')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
