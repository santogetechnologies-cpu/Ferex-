import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { education } from '../src/data/workflows/curatedEducation.ts';
import { rimi, trade, digital } from '../src/data/workflows/curatedOthers.ts';
const CURATED = { education, rimi, trade, digital };

const inventoryPath = new URL('../src/data/workflows/inventory.generated.json', import.meta.url).pathname;
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const APPS = ['education', 'rimi', 'trade', 'digital'] as const;

test('the committed inventory matches the code (run npm run gen:workflows after changing screens)', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wf-')), 'inventory.json');
  execFileSync('node', ['scripts/gen-app-workflows.mjs'], { env: { ...process.env, WORKFLOWS_OUT: out }, stdio: 'pipe' });
  assert.equal(fs.readFileSync(out, 'utf8'), fs.readFileSync(inventoryPath, 'utf8'));
});

test('every screen in App.tsx that renders a page is in the inventory', () => {
  const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const paths = [...app.matchAll(/<Route path="(\/(?:admin|student|staff|rimi|trade|digital)[^"]*)" element=\{<ProtectedRoute/g)].map(m => m[1]);
  const known = new Set(APPS.flatMap(a => inventory.apps[a].pages.map((p: any) => p.path)));
  const missing = paths.filter(p => !known.has(p));
  assert.deepEqual(missing, []);
});

for (const key of APPS) {
  test(`${key}: curated flows are well formed and point at real screens`, () => {
    const pages = new Set(inventory.apps[key].pages.map((p: any) => p.path));
    const c = CURATED[key];
    assert.ok(c.flows.length >= 2, 'at least two flowcharts');
    for (const f of c.flows) {
      const lanes = new Set(f.lanes.map(l => l.id)); const ids = new Set<string>();
      for (const n of f.nodes) {
        assert.ok(!ids.has(n.id), `${f.id}: duplicate node ${n.id}`); ids.add(n.id);
        assert.ok(lanes.has(n.lane), `${f.id}/${n.id}: unknown lane ${n.lane}`);
        for (const s of n.screens || []) assert.ok(pages.has(s), `${f.id}/${n.id}: unknown screen ${s}`);
      }
      for (const e of f.edges) { assert.ok(ids.has(e.from), `${f.id}: edge from ${e.from}`); assert.ok(ids.has(e.to), `${f.id}: edge to ${e.to}`); }
    }
    const ids = new Set(c.dfd.nodes.map(n => n.id));
    for (const n of c.dfd.nodes) for (const s of n.screens || []) assert.ok(pages.has(s), `dfd/${n.id}: unknown screen ${s}`);
    for (const e of c.dfd.edges) { assert.ok(ids.has(e.from), `dfd edge from ${e.from}`); assert.ok(ids.has(e.to), `dfd edge to ${e.to}`); }
  });
}
