import fs from 'node:fs';

const content = fs.readFileSync('src/lib/api/rimi.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (
    l.includes('export async function deleteRimi') ||
    l.includes('export async function updateRimiSalesOrderStatus') ||
    l.includes('export async function updateRimiSalesOrder') ||
    l.includes('export async function getRimiBatches') ||
    l.includes('export async function getRimiProducts') ||
    l.includes('export async function createRimiProduct') ||
    l.includes('occupancy') ||
    l.includes('Occupancy')
  ) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
