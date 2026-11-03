export interface UniversityImportRow {
  name: string;
  country: string;
  city: string;
  tuition_range: string;
  programs: string[];
  intakes: string[];
  banner_image_url?: string;
  image_url?: string;
  logo_url?: string;
  tuition_fee_currency?: string;
  tuition_fee_min?: number;
  tuition_fee_max?: number;
  tuition_pln?: number;
  tuition_eur?: number;
  tuition_usd?: number;
  tuition_inr?: number;
  vfs_fee?: string;
  agency_fee?: string;
  ranking?: number;
  rating?: number;
  nawa_required?: boolean;
  scholarship_percentage_max?: number;
  direct_payment_instructions?: string;
}

export const universityImportTemplate =
  'name,country,city,tuition_range,tuition_fee_currency,tuition_pln,tuition_eur,banner_image_url,logo_url,vfs_fee,programs,intakes\r\n' +
  'Warsaw University of Technology,Poland,Warsaw,"12,000 - 18,000 PLN / yr",PLN,15000,3500,"https://images.unsplash.com/photo-1541339907198-e08756dedf3f","https://logo.clearbit.com/pw.edu.pl","€150 (VFS Global)",Computer Science|Civil Engineering,October|February\r\n' +
  'Technical University of Munich,Germany,Munich,"€0 - €3,000 / yr",EUR,0,1500,"https://images.unsplash.com/photo-1562774053-701939374585","https://logo.clearbit.com/tum.de","€100 (Embassy)",Robotics|Data Engineering,October\r\n' +
  'University of Toronto,Canada,Toronto,"CAD 20,000 / yr",CAD,0,14000,"https://images.unsplash.com/photo-1523240795612-9a054b0db644","https://logo.clearbit.com/utoronto.ca","CAD 150",Business|Computer Science,September|January\r\n';

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
  const supported = [
    'name', 'country', 'city', 'tuition_range', 'programs', 'intakes',
    'banner_image_url', 'image_url', 'logo_url', 'tuition_fee_currency',
    'tuition_fee_min', 'tuition_fee_max', 'tuition_pln', 'tuition_eur',
    'tuition_usd', 'tuition_inr', 'vfs_fee', 'agency_fee', 'ranking',
    'rating', 'nawa_required', 'scholarship_percentage_max', 'direct_payment_instructions'
  ];
  if (!headers.includes('name') || !headers.includes('country')) throw new Error('CSV requires name and country columns.');
  if (new Set(headers).size !== headers.length || headers.some(h => !supported.includes(h))) {
    throw new Error('Use the template column names; duplicate or unknown columns are not supported.');
  }
  if (!records.length || records.length > 5000) throw new Error('Upload between 1 and 5,000 universities per file.');
  return records.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Row ${index + 2}: column count does not match the header.`);
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    if (!row.name || !row.country) throw new Error(`Row ${index + 2}: name and country are required.`);

    const parseNum = (val?: string) => {
      if (!val || val.trim() === '') return undefined;
      const clean = Number(val.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(clean) ? clean : undefined;
    };

    const bannerImg = row.banner_image_url || row.image_url || '';

    return {
      name: row.name,
      country: row.country.replace(/\s+/g, ' '),
      city: row.city || '',
      tuition_range: row.tuition_range || '',
      programs: (row.programs || '').split('|').map(s => s.trim()).filter(Boolean),
      intakes: (row.intakes || '').split('|').map(s => s.trim()).filter(Boolean),
      banner_image_url: bannerImg,
      image_url: bannerImg,
      logo_url: row.logo_url || '',
      tuition_fee_currency: row.tuition_fee_currency || (row.country.toLowerCase().includes('poland') ? 'PLN' : 'EUR'),
      tuition_fee_min: parseNum(row.tuition_fee_min),
      tuition_fee_max: parseNum(row.tuition_fee_max),
      tuition_pln: parseNum(row.tuition_pln),
      tuition_eur: parseNum(row.tuition_eur),
      tuition_usd: parseNum(row.tuition_usd),
      tuition_inr: parseNum(row.tuition_inr),
      vfs_fee: row.vfs_fee || '',
      agency_fee: row.agency_fee || '',
      ranking: parseNum(row.ranking) ? Math.round(Number(parseNum(row.ranking))) : undefined,
      rating: parseNum(row.rating),
      nawa_required: row.nawa_required !== undefined ? ['true', '1', 'yes'].includes(String(row.nawa_required).toLowerCase()) : (row.country.toLowerCase().includes('poland') ? true : undefined),
      scholarship_percentage_max: parseNum(row.scholarship_percentage_max),
      direct_payment_instructions: row.direct_payment_instructions || ''
    };
  });
}
