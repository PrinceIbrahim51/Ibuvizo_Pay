import { test } from 'node:test';
import assert from 'node:assert/strict';

import { amountToPaise, applyKey, formatRupees } from '../src/lib/money.ts';
import { parseUpiQr } from '../src/lib/upiQr.ts';
import { isWeakPin, sanitizeText } from '../src/lib/validation.ts';

test('formats rupees with Indian grouping', () => {
  assert.equal(formatRupees(2458000), '24,580');
  assert.equal(formatRupees(2458000, { decimals: 'always' }), '24,580.00');
  assert.equal(formatRupees(1234567890), '1,23,45,678.90');
  assert.equal(formatRupees(50), '0.50');
});

test('keypad input never exceeds limits', () => {
  let v = '';
  for (const k of ['2', '5', '0', '0']) v = applyKey(v, k);
  assert.equal(v, '2500');
  assert.equal(amountToPaise(v), 250000);
  assert.equal(applyKey('12.34', '5'), '12.34');
  assert.equal(applyKey('100000', '0'), '100000');
  assert.equal(applyKey('', '.'), '0.');
  assert.equal(applyKey('0', '7'), '7');
});

test('parses a valid UPI QR', () => {
  const qr = parseUpiQr('upi://pay?pa=metromart@okaxis&pn=Metro%20Mart&am=1240.00&tn=Groceries&cu=INR');
  assert.deepEqual(qr, { vpa: 'metromart@okaxis', name: 'Metro Mart', amountPaise: 124000, note: 'Groceries' });
});

test('rejects tampered or malicious QR codes', () => {
  assert.equal(parseUpiQr('upi://pay?pa=a@b&pa=evil@bank'), null);
  assert.equal(parseUpiQr('upi://pay?pa=shop@okaxis&pn=%3Cscript%3E'), null);
  assert.equal(parseUpiQr('upi://pay?pa=shop@okaxis&cu=USD'), null);
  assert.equal(parseUpiQr('upi://pay?pa=shop@okaxis&am=-5'), null);
  assert.equal(parseUpiQr('https://evil.example/pay'), null);
  assert.equal(parseUpiQr('upi://pay?pa=shop@okaxis&tn=%E0%A4%A'), null);
});

test('weak pins and sanitising', () => {
  assert.ok(isWeakPin('123456'));
  assert.ok(isWeakPin('1111'));
  assert.ok(isWeakPin('987654'));
  assert.ok(!isWeakPin('482915'));
  assert.equal(sanitizeText('Hi <b>there</b>'), 'Hi bthere/b');
});
