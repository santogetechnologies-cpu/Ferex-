import fs from 'node:fs';

const content = fs.readFileSync('src/pages/rimi/RimiInventory.tsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines in RimiInventory.tsx:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('Pallet') || l.includes('pallet') || l.includes('Occupancy') || l.includes('occupancy')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
