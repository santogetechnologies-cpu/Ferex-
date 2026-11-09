import fs from 'node:fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('collections') || l.includes('Collections') || l.includes('rimi')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});

