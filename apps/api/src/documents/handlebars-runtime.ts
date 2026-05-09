import Handlebars from 'handlebars';

const numberFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const intFormatter = new Intl.NumberFormat('th-TH');

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function toDate(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

Handlebars.registerHelper('formatNumber', (value: unknown) => {
  if (value == null) return '—';
  const n = Number(value);
  if (!isFinite(n)) return String(value);
  return Number.isInteger(n) ? intFormatter.format(n) : numberFormatter.format(n);
});

Handlebars.registerHelper('formatThaiDate', (value: unknown) => {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
});

Handlebars.registerHelper('formatDateTime', (value: unknown) => {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString('th-TH');
});

Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

Handlebars.registerHelper('default', (value: unknown, fallback: unknown) =>
  value == null || value === '' ? fallback : value,
);

// Used inside {{#each}} to get 1-based index.
// Usage: {{@index1}}
Handlebars.registerHelper('index1', function (this: unknown, options: Handlebars.HelperOptions) {
  const data = options.data as { index?: number } | undefined;
  return (data?.index ?? 0) + 1;
});

// Provide @index1 automatically inside each blocks.
// Override the each block helper not needed — we register a SafeString helper instead via partial.
// Just expose helper name 'inc' for adding 1 to index.
Handlebars.registerHelper('inc', (n: unknown) => Number(n) + 1);

export const handlebarsRuntime = Handlebars;
