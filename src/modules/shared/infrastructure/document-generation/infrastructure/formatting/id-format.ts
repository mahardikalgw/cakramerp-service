const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Indonesian number grouping, e.g. `1234567.5` -> `1.234.567,5`.
 * Integral values omit decimals.
 */
export function formatNumberId(value: unknown): string {
  const n = toNumber(value);
  const hasFraction = Math.abs(n % 1) > Number.EPSILON;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(n);
}

/** Indonesian number grouping with two decimals, e.g. `1.234.567,00`. */
export function formatCurrencyId(value: unknown): string {
  const n = toNumber(value);
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Indonesian long date, e.g. `4 Oktober 2026`. */
export function formatDateId(value: unknown): string {
  const d = toDate(value);
  if (!d) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** `YYYY-MM-DD`, or `-` when unparseable. */
export function formatDateIso(value: unknown): string {
  const d = toDate(value);
  if (!d) return '-';
  return d.toISOString().slice(0, 10);
}

/** Pass-through string with a dash fallback. */
export function safeText(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}
