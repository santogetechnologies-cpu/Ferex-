import fs from 'node:fs';
import path from 'node:path';

function searchIn(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      searchIn(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const txt = fs.readFileSync(p, 'utf8');
      if (txt.includes('Pallet') || txt.includes('pallet') || txt.includes('100 Pallets') || txt.includes('Occupancy')) {
        console.log(`Found in ${p}`);
        const lns = txt.split('\n');
        lns.forEach((l, i) => {
          if (l.includes('Pallet') || l.includes('pallet') || l.includes('100 Pallets') || l.includes('Occupancy')) {
            console.log(`  ${i + 1}: ${l.trim()}`);
          }
        });
      }
    }
  }
}
searchIn('src/pages/rimi');

