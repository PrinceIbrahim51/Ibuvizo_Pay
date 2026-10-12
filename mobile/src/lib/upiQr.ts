/**
 * Parses UPI QR codes / deep links:  upi://pay?pa=shop@okbank&pn=Metro%20Mart&am=120.00&tn=Groceries&cu=INR
 * Every field is validated against an allow-list; anything unexpected makes the QR invalid,
 * so a malicious QR cannot inject markup, change the currency or smuggle extra parameters into the payment.
 */

export type UpiQr = {
  vpa: string;
  name?: string;
  amountPaise?: number;
  note?: string;
  merchantCode?: string;
};

const VPA = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,48}@[a-zA-Z][a-zA-Z0-9]{1,30}(\.[a-zA-Z0-9]{2,20}){0,3}$/;
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'&()-]{0,79}$/u;
const NOTE = /^[\p{L}\p{M}\p{N} .,'&()/#@:_+!?%-]{0,100}$/u;
const AMOUNT = /^\d{1,7}(\.\d{1,2})?$/;

function safeDecode(v: string): string | null {
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

export function parseUpiQr(raw: string): UpiQr | null {
  if (typeof raw !== 'string' || raw.length > 1024) return null;
  const trimmed = raw.trim();
  const match = /^upi:\/\/pay\?(.*)$/i.exec(trimmed);
  if (!match) {
    // Plain UPI ID typed or encoded without the upi:// wrapper.
    return VPA.test(trimmed) ? { vpa: trimmed.toLowerCase() } : null;
  }
  const params = new Map<string, string>();
  for (const part of match[1].split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = (eq < 0 ? part : part.slice(0, eq)).toLowerCase();
    const value = safeDecode(eq < 0 ? '' : part.slice(eq + 1));
    if (value === null) return null;
    if (params.has(key)) return null; // duplicate parameters are a known QR tampering trick
    params.set(key, value.trim());
  }
  const vpa = params.get('pa');
  if (!vpa || !VPA.test(vpa)) return null;
  const cu = params.get('cu');
  if (cu && cu.toUpperCase() !== 'INR') return null;

  const result: UpiQr = { vpa: vpa.toLowerCase() };
  const pn = params.get('pn');
  if (pn) {
    if (!NAME.test(pn)) return null;
    result.name = pn;
  }
  const am = params.get('am');
  if (am) {
    if (!AMOUNT.test(am)) return null;
    const [r, d = ''] = am.split('.');
    const paise = Number(r) * 100 + Number(d.padEnd(2, '0'));
    if (paise <= 0 || paise > 10_000_000) return null;
    result.amountPaise = paise;
  }
  const tn = params.get('tn');
  if (tn) {
    if (!NOTE.test(tn)) return null;
    result.note = tn;
  }
  const mc = params.get('mc');
  if (mc && /^\d{4}$/.test(mc)) result.merchantCode = mc;
  return result;
}

export function buildUpiQr(vpa: string, name: string, amountPaise?: number, note?: string): string {
  const parts = [`pa=${encodeURIComponent(vpa)}`, `pn=${encodeURIComponent(name)}`, 'cu=INR'];
  if (amountPaise) parts.push(`am=${(amountPaise / 100).toFixed(2)}`);
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${parts.join('&')}`;
}
