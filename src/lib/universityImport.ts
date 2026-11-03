export interface UniversityImportRow {
  name: string;
  country: string;
  city: string;
  tuition_range: string;
  programs: string[];
  intakes: string[];
}

export const universityImportTemplate = 'name,country,city,tuition_range,programs,intakes\r\nExample University,Canada,Toronto,"CAD 20,000 / yr",Business|Computer Science,September|January\r\nExample Institute,Germany,Berlin,,Engineering,October\r\n';
export const countryKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
export const universityKey = (row: { name: string; country: string; city?: string }) =>
  JSON.stringify([countryKey(row.name), countryKey(row.country), countryKey(row.city || '')]);

// Quoted commas, escaped quotes, multiline cells, CRLF and UTF-8 BOM are supported.
export function parseUniversityImport(text: string): UniversityImportRow[] {
  const records: string[][] = [];
  let record: string[] = [], cell = '', quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      record.push(cell.trim()); cell = ''; closed = false;
      if (c !== ',') {
        if (record.some(Boolean)) records.push(record);
        record = [];
        if (c === '\r' && input[i + 1] === '\n') i++;
      }
    } else if (c === '"' && !cell && !closed) quoted = true;
    else {
      if (closed || c === '"') throw new Error('Invalid CSV quoting. Export the file as CSV and try again.');
      cell += c;
    }
  }
  if (quoted) throw new Error('Unclosed quoted cell in CSV.');
  record.push(cell.trim());
  if (record.some(Boolean)) records.push(record);
  const headers = records.shift()?.map(countryKey) || [];
  const supported = ['name', 'country', 'city', 'tuition_range', 'programs', 'intakes'];
  if (!headers.includes('name') || !headers.includes('country')) throw new Error('CSV requires name and country columns.');
  if (new Set(headers).size !== headers.length || headers.some(h => !supported.includes(h))) throw new Error('Use the template column names; duplicate or unknown columns are not supported.');
  if (!records.length || records.length > 5000) throw new Error('Upload between 1 and 5,000 universities per file.');
  return records.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Row ${index + 2}: column count does not match the header.`);
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    if (!row.name || !row.country) throw new Error(`Row ${index + 2}: name and country are required.`);
    return { name: row.name, country: row.country.replace(/\s+/g, ' '), city: row.city || '', tuition_range: row.tuition_range || '',
      programs: (row.programs || '').split('|').map(s => s.trim()).filter(Boolean), intakes: (row.intakes || '').split('|').map(s => s.trim()).filter(Boolean) };
  });
}
