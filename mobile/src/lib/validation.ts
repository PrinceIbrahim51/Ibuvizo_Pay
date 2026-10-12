/** Client-side checks mirror the server's allow-lists. The server re-validates everything; these are for UX. */
export const rules = {
  phone10: /^[6-9]\d{9}$/,
  otp: /^\d{6}$/,
  mpin: /^\d{6}$/,
  upiPin: /^(\d{4}|\d{6})$/,
  name: /^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,79}$/u,
  safeText: /^[\p{L}\p{M}\p{N} .,'&()/#@:_+!?%-]{0,100}$/u,
  vpa: /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,48}@[a-zA-Z][a-zA-Z0-9]{1,30}(\.[a-zA-Z0-9]{2,20}){0,3}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  accountNumber: /^\d{9,18}$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  email: /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,100}\.[A-Za-z]{2,10}$/,
};

/** Removes characters the server would reject, so typing "<" simply does nothing instead of erroring later. */
export function sanitizeText(value: string, max = 100): string {
  return value
    .replace(/[<>"`;\\{}[\]|^~$*=]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, max);
}

export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

/** Same weak-PIN rule as the server: no repeated or sequential digits, no common PINs. */
export function isWeakPin(pin: string): boolean {
  const common = ['123456', '654321', '121212', '112233', '123123', '696969', '1234', '4321', '1212', '2580', '0852', '1122'];
  if (common.includes(pin) || new Set(pin).size === 1) return true;
  let asc = true;
  let desc = true;
  for (let i = 1; i < pin.length; i++) {
    const diff = pin.charCodeAt(i) - pin.charCodeAt(i - 1);
    asc = asc && diff === 1;
    desc = desc && diff === -1;
  }
  return asc || desc;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '').slice(-10);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}
