import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUniversityImport, universityKey } from '../src/lib/universityImport.ts';

test('CSV supports BOM, quoted commas, escaped quotes, multiline cells and program lists', () => {
  const rows = parseUniversityImport('\uFEFFname,country,programs\r\n"A, ""B""",Canada,Business|Science\r\n"Line\nUniversity",Germany,Engineering');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'A, "B"');
  assert.deepEqual(rows[0].programs, ['Business', 'Science']);
  assert.equal(rows[1].name, 'Line\nUniversity');
});

test('invalid imports fail before writes', () => {
  for (const csv of ['name,country\nA,', 'name,country\n"A,Canada', 'name,country\nA,Canada,Extra', 'name,name,country\nA,B,Canada', 'name,country\n']) {
    assert.throws(() => parseUniversityImport(csv));
  }
});

test('duplicate matching normalizes whitespace and case but preserves country and campus', () => {
  assert.equal(universityKey({ name: ' A ', country: ' CANADA ' }), universityKey({ name: 'a', country: 'Canada' }));
  assert.notEqual(universityKey({ name: 'A', country: 'Canada' }), universityKey({ name: 'A', country: 'Germany' }));
  assert.notEqual(universityKey({ name: 'A', country: 'Canada', city: 'Toronto' }), universityKey({ name: 'A', country: 'Canada', city: 'Ottawa' }));
});
