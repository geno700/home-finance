import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, readBackup } from '../js/backup.js';

const categories = [
  { id: 'c-a', name_ar: 'الأساسيات والفواتير', name_en: 'Utilities & Bills', budget: 2500, color: '#3b82f6', sort_order: 1 },
  { id: 'c-b', name_ar: 'المواصلات', name_en: 'Transportation', budget: 1500, color: '#eab308', sort_order: 2 },
];
const expenses = [
  { id: 'e1', date: '2026-11-10', category_id: 'c-a', amount: 250, description: 'فاتورة نت', payment_method: 'wallet',
    raw_input: 'فاتورة نت 250 فودافون كاش', created_at: '2026-11-10T10:00:00Z' },
  { id: 'e2', date: '2026-11-11', category_id: null, amount: 40, description: 'حاجات', payment_method: 'cash',
    raw_input: null, created_at: '2026-11-11T10:00:00Z' },
];

test('web backup uses the Android format', () => {
  const root = JSON.parse(buildBackup({ name: 'بيت', currency: 'ج.م' }, categories, expenses));
  assert.equal(root.app, 'SmartHomeFinance');
  assert.equal(root.version, 2);
  assert.equal(root.categories[0].id, 1);
  assert.equal(root.categories[0].colorHex, 0xff3b82f6);
  assert.equal(root.categories[0].allocatedBudget, 2500);
  assert.equal(root.expenses[0].categoryId, 1);
  assert.equal(root.expenses[0].paymentMethod, 'محفظة إلكترونية');
  assert.equal(root.expenses[1].categoryId, 0);
});

test('web backup round trip', () => {
  const back = readBackup(buildBackup({ name: 'بيت', currency: 'ج.م' }, categories, expenses));
  assert.equal(back.currency, 'ج.م');
  assert.equal(back.categories.length, 2);
  assert.equal(back.categories[1].color, '#eab308');
  assert.equal(back.expenses.length, 2);
  assert.equal(back.expenses[0].category_key, '1');
  assert.equal(back.expenses[0].payment_method, 'wallet');
  assert.equal(back.expenses[1].category_key, null);
});

test('reads a file from the Android app', () => {
  const android = JSON.stringify({
    app: 'SmartHomeFinance', version: 2, timestamp: 1, currency: 'ج.م',
    categories: [{ id: 7, nameAr: 'العلاج', nameEn: 'Medical & Health', allocatedBudget: 1000, iconKey: 'x', colorHex: 0xffec4899, orderIndex: 8 }],
    expenses: [
      { id: 1, date: '2026-10-10', categoryId: 7, category: 'العلاج', amount: 180, description: 'صيدلية', paymentMethod: 'نقداً', rawInput: '', timestamp: 1 },
      { id: 2, date: '2026-10-11', categoryId: 0, category: 'العلاج', amount: 90, description: 'دوا', paymentMethod: 'فيزا', rawInput: '', timestamp: 1 },
      { id: 3, date: 'bad', categoryId: 7, amount: 0, description: 'zero', paymentMethod: 'نقداً' },
    ],
  });
  const back = readBackup(android);
  assert.equal(back.categories[0].color, '#ec4899');
  assert.equal(back.expenses.length, 2);
  assert.equal(back.expenses[0].category_key, '7');
  assert.equal(back.expenses[1].category_key, '7'); // matched by name
  assert.equal(back.expenses[1].payment_method, 'card');
});

test('rejects files that are not backups', () => {
  assert.throws(() => readBackup('not json'), /bad/);
  assert.throws(() => readBackup('{"hello":1}'), /bad/);
  assert.throws(() => readBackup('{"categories":[],"expenses":[]}'), /empty/);
});
