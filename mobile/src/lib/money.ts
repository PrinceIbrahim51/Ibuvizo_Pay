/** All amounts travel as integer paise. These helpers only format/parse for display and input. */

const MAX_PAISE = 10_000_000; // Rs 1,00,000 per transaction (NPCI P2P limit)

/** 123456789 -> "12,34,567.89" (Indian digit grouping). */
export function formatRupees(paise: number, opts: { decimals?: 'auto' | 'always' } = {}): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  const digits = String(rupees);
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  const showDecimals = opts.decimals === 'always' || fraction !== 0;
  return (negative ? '-' : '') + grouped + (showDecimals ? '.' + String(fraction).padStart(2, '0') : '');
}

export const rupee = (paise: number, opts?: { decimals?: 'auto' | 'always' }) => '₹' + formatRupees(paise, opts);

/**
 * Applies one keypad press to the amount string shown on the Send Money screen.
 * Allows at most 2 decimals, no leading zeros and never more than the per-transaction limit.
 */
export function applyKey(current: string, key: string): string {
  if (key === 'back') return current.slice(0, -1);
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : current + '.';
  }
  if (!/^\d$/.test(key)) return current;
  const [, dec] = current.split('.');
  if (dec !== undefined && dec.length >= 2) return current;
  const next = current === '0' ? key : current + key;
  const paise = amountToPaise(next);
  return paise !== null && paise > MAX_PAISE ? current : next;
}

/** "2500" -> 250000, "12.5" -> 1250. Returns null for invalid input. */
export function amountToPaise(value: string): number | null {
  const v = value.replace(/,/g, '').trim();
  if (!/^\d{1,7}(\.\d{0,2})?$/.test(v)) return null;
  const [r, d = ''] = v.split('.');
  return Number(r) * 100 + Number(d.padEnd(2, '0'));
}

export const MAX_TRANSACTION_PAISE = MAX_PAISE;
