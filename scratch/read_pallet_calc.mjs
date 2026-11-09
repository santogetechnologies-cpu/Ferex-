import fs from 'node:fs';

const content = fs.readFileSync('src/lib/api/rimi.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('// Calculate actual occupied pallets from active batches'));
console.log(lines.slice(idx, idx + 40).join('\n'));
