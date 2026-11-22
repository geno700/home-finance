// Backup files in the Android app's format, so a file from either app can be restored in the other.
// { app: "SmartHomeFinance", version: 2, currency, categories: [...], expenses: [...] }
import { PAYMENT_AR, PAYMENTS } from './constants.js';

const toArgb = (hex) => 0xff000000 + parseInt(String(hex).slice(1), 16);
const fromArgb = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return '#' + (v % 0x1000000).toString(16).padStart(6, '0');
};

export function buildBackup(household, categories, expenses) {
  // The Android app reads ids as numbers, so categories are numbered 1, 2, 3 ... in the file.
  const num = new Map(categories.map((c, i) => [c.id, i + 1]));
  return JSON.stringify(
    {
      app: 'SmartHomeFinance',
      version: 2,
      source: 'web',
      timestamp: Date.now(),
      backupDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
      household: household.name,
      currency: household.currency,
      categories: categories.map((c, i) => ({
        id: i + 1,
        nameAr: c.name_ar,
        nameEn: c.name_en,
        allocatedBudget: Number(c.budget),
        iconKey: 'category',
        colorHex: toArgb(c.color),
        orderIndex: c.sort_order ?? i + 1,
      })),
      expenses: expenses.map((e, i) => {
        const cat = categories.find((c) => c.id === e.category_id);
        return {
          id: i + 1,
          date: e.date,
          categoryId: num.get(e.category_id) ?? 0,
          category: cat?.name_ar ?? '',
          amount: Number(e.amount),
          description: e.description,
          paymentMethod: PAYMENT_AR[e.payment_method] ?? PAYMENT_AR.cash,
          rawInput: e.raw_input ?? '',
          timestamp: Date.parse(e.created_at) || Date.now(),
        };
      }),
    },
    null,
    2,
  );
}

const paymentKey = (v) => {
  if (PAYMENTS.includes(v)) return v;
  const found = Object.entries(PAYMENT_AR).find(([, label]) => label === v);
  if (found) return found[0];
  if (/فيزا|بطاقه|بطاقة|visa|card/i.test(v ?? '')) return 'card';
  if (/محفظ|wallet|فودافون|instapay|انستا/i.test(v ?? '')) return 'wallet';
  if (/تحويل|transfer|bank/i.test(v ?? '')) return 'transfer';
  return 'cash';
};

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Returns { currency, categories, expenses } ready for db.importBackup, or throws with a reason.
export function readBackup(text) {
  let root;
  try {
    root = JSON.parse(text);
  } catch {
    throw new Error('bad');
  }
  if (!root || typeof root !== 'object' || (!Array.isArray(root.categories) && !Array.isArray(root.expenses))) {
    throw new Error('bad');
  }
  const cats = Array.isArray(root.categories) ? root.categories : [];
  const exps = Array.isArray(root.expenses) ? root.expenses : [];
  if (!cats.length && !exps.length) throw new Error('empty');

  const categories = cats.map((c, i) => ({
    key: String(c.id ?? i),
    name_ar: String(c.nameAr ?? c.name_ar ?? '').slice(0, 80),
    name_en: String(c.nameEn ?? c.name_en ?? '').slice(0, 80),
    budget: Math.max(0, Number(c.allocatedBudget ?? c.budget) || 0),
    color: fromArgb(c.colorHex) ?? (typeof c.color === 'string' ? c.color : '#10b981'),
    sort_order: Number(c.orderIndex ?? c.sort_order ?? i + 1) || i + 1,
  }));
  const byName = new Map(categories.map((c) => [c.name_ar, c.key]));

  const expenses = exps
    .map((e) => {
      const key = e.categoryId != null && categories.some((c) => c.key === String(e.categoryId))
        ? String(e.categoryId)
        : byName.get(e.category) ?? null;
      return {
        category_key: key,
        date: isDate(e.date) ? e.date : null,
        amount: Number(e.amount),
        description: String(e.description ?? '').slice(0, 300),
        payment_method: paymentKey(e.paymentMethod ?? e.payment_method),
        raw_input: e.rawInput || e.raw_input ? String(e.rawInput ?? e.raw_input).slice(0, 500) : null,
      };
    })
    .filter((e) => e.amount > 0 && e.amount < 1e12);

  if (!categories.length && !expenses.length) throw new Error('empty');
  return { currency: typeof root.currency === 'string' ? root.currency.slice(0, 12) : null, categories, expenses };
}
