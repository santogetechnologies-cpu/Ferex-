// Country name -> ISO code. Flags are shown as pictures (emoji flags render as two letters on Windows).
const CODES: Record<string, string> = {
  poland: 'pl', germany: 'de', italy: 'it', france: 'fr', spain: 'es', 'united kingdom': 'gb', uk: 'gb', england: 'gb', ireland: 'ie', moldova: 'md', hungary: 'hu',
  lithuania: 'lt', latvia: 'lv', estonia: 'ee', albania: 'al', australia: 'au', austria: 'at', bulgaria: 'bg', finland: 'fi', georgia: 'ge', greece: 'gr', malaysia: 'my',
  malta: 'mt', mauritius: 'mu', montenegro: 'me', 'new zealand': 'nz', sweden: 'se', 'czech republic': 'cz', czechia: 'cz', canada: 'ca', usa: 'us', 'united states': 'us',
  netherlands: 'nl', belgium: 'be', switzerland: 'ch', norway: 'no', denmark: 'dk', portugal: 'pt', romania: 'ro', serbia: 'rs', croatia: 'hr', slovakia: 'sk', slovenia: 'si',
  cyprus: 'cy', turkey: 'tr', 'north macedonia': 'mk', 'bosnia and herzegovina': 'ba', ukraine: 'ua', uae: 'ae', 'united arab emirates': 'ae', singapore: 'sg', japan: 'jp',
  'south korea': 'kr', india: 'in', armenia: 'am', kazakhstan: 'kz', uzbekistan: 'uz', kyrgyzstan: 'kg', russia: 'ru', belarus: 'by', luxembourg: 'lu', iceland: 'is',
};

export function flagCode(name: string, destCode?: string): string {
  const byName = CODES[name.trim().toLowerCase()];
  if (byName) return byName;
  const c = (destCode || '').trim().toLowerCase();
  return /^[a-z]{2}$/.test(c) ? c : '';
}
export const flagUrl = (code: string, width = 80) => `https://flagcdn.com/w${width}/${code}.png`;
