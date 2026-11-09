import fs from 'node:fs';

const content = fs.readFileSync('src/pages/rimi/RimiProducts.tsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines in RimiProducts.tsx:', lines.length);
lines.forEach((l, i) => {
  if (
    l.includes('isAddingProduct') || l.includes('showAddModal') ||
    l.includes('newProduct') || l.includes('quantity') ||
    l.includes('opening_stock') || l.includes('warehouse') ||
    l.includes('batch') || l.includes('Batch') || l.includes('Hub')
  ) {
    if (i < 200 || (i > 400 && i < 600)) {
      console.log(`${i + 1}: ${l.trim()}`);
    }
  }
});

