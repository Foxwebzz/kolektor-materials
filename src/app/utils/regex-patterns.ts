// Character classes for Serbian/Croatian letters
export const LATIN_LETTERS = 'A-Za-z';
export const SERBIAN_LETTERS = 'ČĆŽŠĐčćžšđ';
export const ALL_LETTERS = `${LATIN_LETTERS}${SERBIAN_LETTERS}`;

// Common symbols
export const DIGITS = '0-9';
export const WHITESPACE = '\\s';
export const COMMON_SYMBOLS = "().,/+\\-&'";

// Combined patterns for regex use
export const LETTERS_AND_DIGITS = `${ALL_LETTERS}${DIGITS}`;
export const TEXT_PATTERN = `${ALL_LETTERS}${DIGITS}${WHITESPACE}${COMMON_SYMBOLS}`;

// Ready-to-use character classes (wrapped in brackets)
export const LETTER_CLASS = `[${ALL_LETTERS}]`;
export const TEXT_CLASS = `[${TEXT_PATTERN}]`;

// Helper function to create regex pattern for text fields
export function createTextPattern(additionalChars = ''): string {
  return `[${TEXT_PATTERN}${additionalChars}]`;
}

// Helper function to create a capturing group for text until a terminator
export function createCaptureUntil(terminators: string[]): string {
  const terminatorPattern = terminators.join('|');
  return `(${TEXT_CLASS}*?)(?=${WHITESPACE}+(?:${terminatorPattern}|$))`;
}

// Helper function to create regex for extracting labeled PDF fields
// Uses .*? (any character) so all symbols are supported - terminators define the boundary
// Usage: createPdfFieldRegex('Kupac', ['Broj komada:', 'Tip Transformatora:'])
export function createPdfFieldRegex(label: string, terminators: string[]): RegExp {
  const terminatorPattern = terminators.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`${label}:\\s*(.*?)(?=\\s+(?:${terminatorPattern}|$))`, 'i');
}

// Known PDF field labels and table headers to filter out false matches
const PDF_FIELD_LABELS = [
  'Broj ponude', 'Broj tehnike', 'Kupac', 'Broj komada',
  'Tip', 'Tip Transformatora', 'Komercijalista', 'Zemlja', 'Datum',
  'Grupa', 'Cena', 'Udeo', 'Poz', 'Naziv', 'Kolicina', 'Ukupna cena',
];

// Helper function to extract field value from PDF text
export function extractPdfField(text: string, label: string, terminators: string[]): string {
  const regex = createPdfFieldRegex(label, terminators);
  const match = text.match(regex);
  const value = match?.[1]?.trim() ?? '';
  // If the extracted value starts with a known label or table header, return empty
  if (PDF_FIELD_LABELS.some((l) => value === l || value.startsWith(l + ':') || value.startsWith(l + ' '))) {
    return '';
  }
  // Strip any trailing field label that got captured
  let cleaned = value;
  for (const l of PDF_FIELD_LABELS) {
    const labelWithColon = l + ':';
    const idx = cleaned.indexOf(labelWithColon);
    if (idx > 0) {
      cleaned = cleaned.substring(0, idx).trim();
    }
    // Also check for table headers without colon (e.g. "Grupa Cena...")
    const idx2 = cleaned.indexOf(' ' + l + ' ');
    if (idx2 >= 0) {
      cleaned = cleaned.substring(0, idx2).trim();
    }
  }
  return cleaned;
}

// Valid material group codes (from materials.data.ts)
export const VALID_GROUPS = ['Cu', 'Fe', 'Fei', 'Oil', 'Pap', 'h', 'n'] as const;
export const GROUP_PATTERN = VALID_GROUPS.join('|');

// Helper to sanitize text for PDF export (replace special chars with ASCII)
export function sanitizeForPdf(text: string): string {
  const charMap: Record<string, string> = {
    č: 'c',
    Č: 'C',
    ć: 'c',
    Ć: 'C',
    ž: 'z',
    Ž: 'Z',
    š: 's',
    Š: 'S',
    đ: 'd',
    Đ: 'D',
  };
  return text.replace(/[čČćĆžŽšŠđĐ]/g, (char) => charMap[char] || char);
}
