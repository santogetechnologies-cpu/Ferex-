import fs from 'node:fs';

const content = fs.readFileSync('src/pages/rimi/RimiCollections.tsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((l, i) => {
  if (
    l.includes('filter') || l.includes('Filter') ||
    l.includes('Daily') || l.includes('Weekly') ||
    l.includes('Monthly') || l.includes('Yearly') ||
    l.includes('summary') || l.includes('Summary')
  ) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
