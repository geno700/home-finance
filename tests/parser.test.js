// Run with: node --test web/tests
// Same cases as the Android app's ExampleUnitTest, plus a few web-only ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, normalize, localDate } from '../js/parser.js';

const now = new Date(2026, 10, 22, 12, 0); // 22 Nov 2026

test('English input', () => {
  const r = parse('Paid 120 for electricity bill by visa', { now });
  assert.equal(r.kind, 'bills');
  assert.equal(r.amount, 120);
  assert.equal(r.payment, 'card');
});

test('Egyptian Arabic meat with cash', () => {
  const r = parse('اشتريت كيلو ونص لحمة بلدي بـ 450 جنيه كاش', { now });
  assert.equal(r.kind, 'meat');
  assert.equal(r.amount, 450);
  assert.equal(r.payment, 'cash');
  assert.equal(r.description, 'كيلو ونص لحمة بلدي');
});

test('milk is dairy, not coffee', () => {
  const r = parse('جبت لبن بـ 40', { now });
  assert.equal(r.kind, 'dairy');
  assert.equal(r.amount, 40);
});

test('short meat keywords do not match inside produce words', () => {
  assert.equal(parse('موز بـ 30 جنيه', { now }).kind, 'produce');
  assert.equal(parse('بطاطس بـ 25', { now }).kind, 'produce');
  assert.equal(parse('بطيخة بـ 60', { now }).kind, 'produce');
  assert.equal(parse('جوز بط بـ 400', { now }).kind, 'meat');
});

test('internet keyword needs a whole word', () => {
  const r = parse('كنت في السوبرماركت ودفعت 500', { now });
  assert.equal(r.kind, 'pantry');
  assert.equal(r.amount, 500);
  assert.equal(parse('باقة النت بـ 200', { now }).kind, 'bills');
});

test('English gasoline is transport, gas bill is utilities', () => {
  assert.equal(parse('gasoline 300 cash', { now }).kind, 'transport');
  assert.equal(parse('gas bill 120', { now }).kind, 'bills');
});

test('description keeps the letters ب and ج inside words', () => {
  assert.equal(parse('كباب بـ 200', { now }).description, 'كباب');
});

test('payment words with a prefix leave the description', () => {
  assert.equal(parse('امبارح جبت لبن وجبنة بـ ١٢٠ بالفيزا', { now }).description, 'لبن وجبنة');
  assert.equal(parse('خضار 90 بالكاش', { now }).description, 'خضار');
  assert.equal(parse('فيزا الكارت 300', { now }).description, 'الكارت');
});

test('a date is not read as the amount', () => {
  const r = parse('2026-11-01 فاتورة كهرباء 300', { now });
  assert.equal(r.amount, 300);
  assert.equal(r.date, '2026-11-01');
});

test('word numbers match whole words only', () => {
  assert.equal(parse('دفعت الفاتورة', { now }).amount, 0);
  assert.equal(parse('دفعت الف جنيه ايجار', { now }).amount, 1000);
});

test('Eastern digits with a thousands separator', () => {
  assert.equal(parse('ايجار ١٬٥٠٠ جنيه', { now }).amount, 1500);
  assert.equal(parse('ايجار ١٥٠٠ جنيه', { now }).amount, 1500);
});

test('yesterday and the day before', () => {
  assert.equal(parse('امبارح تاكسي 50', { now }).date, '2026-11-21');
  assert.equal(parse('اول امبارح فراخ 200', { now }).date, '2026-11-20');
  assert.equal(parse('taxi 50 yesterday', { now }).date, '2026-11-21');
  assert.equal(parse('تاكسي 50', { now }).date, '2026-11-22');
});

test('payment methods', () => {
  assert.equal(parse('شحن عداد 200 فودافون كاش', { now }).payment, 'wallet');
  assert.equal(parse('ايجار 3000 تحويل بنكي', { now }).payment, 'transfer');
  assert.equal(parse('سوبرماركت 300 بالفيزا', { now }).payment, 'card');
  assert.equal(parse('سوبرماركت 300', { now }).payment, 'cash');
});

test('unknown text has no kind', () => {
  assert.equal(parse('حاجات 50', { now }).kind, null);
});

test('household category names win over keywords', () => {
  const r = parse('مصاريف مدارس 2000', { now, customNames: [{ id: 'x1', names: ['مدارس', 'School'] }] });
  assert.equal(r.customId, 'x1');
  assert.equal(r.amount, 2000);
});

test('normalize', () => {
  assert.equal(normalize('أحمد ـ مدرسة'), 'احمد  مدرسه');
  assert.equal(normalize('١٢٫٥'), '12.5');
  assert.equal(localDate(new Date(2026, 0, 5)), '2026-01-05');
});
