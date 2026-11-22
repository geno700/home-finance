// Demo data source: sample data kept in this browser (localStorage). Same API as data-supabase.js.
import { DEFAULT_CATEGORIES } from './constants.js';
import { isAr } from './i18n.js';
import { localDate } from './parser.js';

const KEY = 'home-finance-demo';
const ME = 'demo-me';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const code = () => Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');

// [category key, Arabic description, English description, typical amount, payment]
const SAMPLES = [
  ['bills', 'فاتورة كهرباء', 'Electricity bill', 650, 'wallet'],
  ['bills', 'باقة النت', 'Internet package', 300, 'wallet'],
  ['bills', 'شحن عداد المياه', 'Water meter top-up', 150, 'cash'],
  ['bills', 'البواب', 'Building doorman', 200, 'cash'],
  ['transport', 'بنزين', 'Fuel', 500, 'card'],
  ['transport', 'أوبر للشغل', 'Uber to work', 85, 'card'],
  ['transport', 'مترو', 'Metro', 20, 'cash'],
  ['meat', 'لحمة بلدي', 'Beef', 900, 'cash'],
  ['meat', 'فراخ', 'Chicken', 320, 'cash'],
  ['meat', 'سمك بلطي', 'Tilapia fish', 250, 'cash'],
  ['pantry', 'خزين السوبرماركت', 'Supermarket shop', 1200, 'card'],
  ['pantry', 'رز وزيت وسكر', 'Rice, oil and sugar', 450, 'cash'],
  ['dairy', 'جبنة رومي وبيض', 'Cheese and eggs', 280, 'cash'],
  ['dairy', 'لبن وزبادي', 'Milk and yogurt', 90, 'cash'],
  ['cleaning', 'منظفات ومناديل', 'Detergent and tissues', 350, 'card'],
  ['produce', 'خضار وفاكهة', 'Fruit and vegetables', 220, 'cash'],
  ['medical', 'صيدلية', 'Pharmacy', 180, 'cash'],
  ['medical', 'كشف دكتور', 'Doctor visit', 400, 'cash'],
  ['charity', 'صدقة', 'Charity', 200, 'cash'],
  ['fun', 'عشاء في مطعم', 'Dinner out', 600, 'card'],
  ['fun', 'سينما', 'Cinema', 300, 'card'],
];

// Small deterministic random numbers, so the sample looks the same after every reset.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function sample() {
  const hid = uid();
  const people = [
    { id: ME, email: 'you@example.com', full_name: isAr ? 'أنت (تجربة)' : 'You (demo)' },
    { id: 'demo-mona', email: 'mona@example.com', full_name: isAr ? 'منى' : 'Mona' },
    { id: 'demo-omar', email: 'omar@example.com', full_name: isAr ? 'عمر' : 'Omar' },
  ];
  const categories = DEFAULT_CATEGORIES.map((c) => ({
    id: uid(), household_id: hid, name_ar: c.name_ar, name_en: c.name_en, budget: c.budget, color: c.color,
    sort_order: c.sort_order, created_at: new Date().toISOString(), key: c.key,
  }));
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c.id]));

  const expenses = [];
  const rand = rng(42);
  const now = new Date();
  for (let back = 2; back >= 0; back--) {
    const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const days = back === 0 ? now.getDate() : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    // Spread the sample entries over the month; the current month gets fewer because it is not over.
    const entries = back === 0 ? Math.max(4, Math.round((SAMPLES.length * 1.3 * days) / 30)) : Math.round(SAMPLES.length * 1.3);
    for (let i = 0; i < entries; i++) {
      const [key, ar, en, base, pay] = SAMPLES[i % SAMPLES.length];
      const day = 1 + Math.floor(rand() * days);
      const amount = Math.round((base * (0.75 + rand() * 0.6)) / 5) * 5;
      expenses.push({
        id: uid(), household_id: hid, category_id: byKey[key],
        date: localDate(new Date(first.getFullYear(), first.getMonth(), day)),
        amount, description: isAr ? ar : en, payment_method: pay, raw_input: null,
        user_id: rand() < 0.65 ? ME : 'demo-mona',
        created_at: new Date(first.getFullYear(), first.getMonth(), day, 9 + Math.floor(rand() * 12)).toISOString(),
      });
    }
  }
  // Meat goes over budget this month, so the dashboard shows what an alert looks like.
  expenses.push({
    id: uid(), household_id: hid, category_id: byKey.meat, date: localDate(now), amount: 2800,
    description: isAr ? 'خروف العيد (نصيب)' : 'Eid lamb share', payment_method: 'cash', raw_input: null,
    user_id: ME, created_at: now.toISOString(),
  });

  return {
    profiles: people,
    households: [{ id: hid, name: isAr ? 'بيت العيلة' : 'The Family Home', currency: isAr ? 'ج.م' : 'EGP', join_code: code() }],
    memberships: [
      { household_id: hid, user_id: ME, role: 'admin', created_at: '2026-01-01T00:00:00Z' },
      { household_id: hid, user_id: 'demo-mona', role: 'member', created_at: '2026-01-02T00:00:00Z' },
      { household_id: hid, user_id: 'demo-omar', role: 'pending', created_at: '2026-01-03T00:00:00Z' },
    ],
    categories: categories.map(({ key, ...c }) => c),
    expenses,
  };
}

let state;
function load() {
  try {
    state = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    state = null;
  }
  if (!state?.households) {
    state = sample();
    persist();
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked or full: changes last until the page is closed.
  }
}
load();

let hh = null;
const here = () => {
  if (!hh) throw new Error('Choose a household first');
  return hh;
};
const roleIn = (id) => state.memberships.find((m) => m.household_id === id && m.user_id === ME)?.role ?? 'none';
const need = (roles, message) => {
  if (!roles.includes(roleIn(here()))) throw new Error(message);
};
const nameOf = (id) => state.profiles.find((p) => p.id === id)?.full_name ?? '';
const withUser = (e) => ({ ...e, user_name: nameOf(e.user_id) });
const sortExpenses = (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at);

export default {
  async getUser() {
    return { id: ME, email: 'you@example.com' };
  },
  onAuthChange() {
    return () => {};
  },
  async signIn() {},
  async signUp() {
    return { needsConfirm: false };
  },
  async signOut() {},
  async getProfile() {
    return state.profiles.find((p) => p.id === ME);
  },
  async sendPasswordReset() {},
  inRecovery: () => false,
  async setPassword() {},

  resetDemo() {
    state = sample();
    persist();
  },

  // ---- households
  async listHouseholds() {
    return state.memberships
      .filter((m) => m.user_id === ME)
      .map((m) => ({ ...state.households.find((h) => h.id === m.household_id), role: m.role }))
      .filter((h) => h.id);
  },
  useHousehold(id) {
    hh = id;
  },
  async createHousehold(name, currency) {
    const h = { id: uid(), name: name.trim(), currency: (currency || 'ج.م').trim(), join_code: code() };
    state.households.push(h);
    state.memberships.push({ household_id: h.id, user_id: ME, role: 'admin', created_at: new Date().toISOString() });
    for (const c of DEFAULT_CATEGORIES) {
      state.categories.push({
        id: uid(), household_id: h.id, name_ar: c.name_ar, name_en: c.name_en, budget: c.budget, color: c.color,
        sort_order: c.sort_order, created_at: new Date().toISOString(),
      });
    }
    persist();
    return h;
  },
  async joinHousehold(c) {
    const h = state.households.find((x) => x.join_code === String(c).replace(/[^A-Za-z0-9]/g, '').toUpperCase());
    if (!h) throw new Error('No household has this join code');
    return h;
  },
  async updateHousehold({ name, currency }) {
    need(['admin'], 'Only an admin can change the household');
    const h = state.households.find((x) => x.id === here());
    if (name !== undefined) h.name = name.trim();
    if (currency !== undefined) h.currency = currency.trim();
    persist();
  },
  async newJoinCode() {
    need(['admin'], 'Only an admin can change the join code');
    const h = state.households.find((x) => x.id === here());
    h.join_code = code();
    persist();
    return h.join_code;
  },
  async deleteHousehold(id) {
    if (roleIn(id) !== 'admin') throw new Error('Only an admin can delete a household');
    state.households = state.households.filter((h) => h.id !== id);
    state.memberships = state.memberships.filter((m) => m.household_id !== id);
    state.categories = state.categories.filter((c) => c.household_id !== id);
    state.expenses = state.expenses.filter((e) => e.household_id !== id);
    persist();
  },
  async leaveHousehold(id) {
    if (roleIn(id) === 'admin') throw new Error('An admin cannot leave their own household');
    state.memberships = state.memberships.filter((m) => !(m.household_id === id && m.user_id === ME));
    persist();
  },

  // ---- categories
  async listCategories() {
    return state.categories
      .filter((c) => c.household_id === here())
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  },
  async saveCategory(f) {
    need(['member', 'admin'], 'You do not have permission to change budgets');
    const fields = {
      name_ar: f.name_ar.trim(), name_en: (f.name_en ?? '').trim(), budget: Number(f.budget) || 0, color: f.color,
    };
    if (f.sort_order !== undefined) fields.sort_order = f.sort_order;
    if (f.id) {
      const c = state.categories.find((x) => x.id === f.id && x.household_id === here());
      Object.assign(c, fields);
      persist();
      return c;
    }
    const max = Math.max(0, ...state.categories.filter((c) => c.household_id === here()).map((c) => c.sort_order));
    const c = { sort_order: max + 1, ...fields, id: uid(), household_id: here(), created_at: new Date().toISOString() };
    state.categories.push(c);
    persist();
    return c;
  },
  async deleteCategory(id) {
    need(['admin'], 'Only an admin can delete a category');
    state.categories = state.categories.filter((c) => !(c.id === id && c.household_id === here()));
    for (const e of state.expenses) if (e.category_id === id) e.category_id = null;
    persist();
  },

  // ---- expenses
  async listExpenses({ from, to } = {}) {
    return state.expenses
      .filter((e) => e.household_id === here() && (!from || e.date >= from) && (!to || e.date <= to))
      .sort(sortExpenses)
      .map(withUser);
  },
  async getExpense(id) {
    const e = state.expenses.find((x) => x.id === id && x.household_id === here());
    return e ? withUser(e) : null;
  },
  async saveExpense(f) {
    need(['member', 'admin'], 'You do not have permission to add expenses');
    if (!(Number(f.amount) > 0)) throw new Error('Enter an amount above zero');
    const fields = {
      date: f.date, amount: Number(f.amount), description: (f.description ?? '').trim(),
      payment_method: f.payment_method, category_id: f.category_id || null,
    };
    if (f.id) {
      const e = state.expenses.find((x) => x.id === f.id && x.household_id === here());
      Object.assign(e, fields);
      persist();
      return withUser(e);
    }
    const e = {
      ...fields, id: uid(), household_id: here(), raw_input: f.raw_input || null, user_id: ME,
      created_at: new Date().toISOString(),
    };
    state.expenses.push(e);
    persist();
    return withUser(e);
  },
  async deleteExpense(id) {
    need(['member', 'admin'], 'You do not have permission to delete expenses');
    state.expenses = state.expenses.filter((e) => !(e.id === id && e.household_id === here()));
    persist();
  },

  async importBackup({ categories, expenses }) {
    need(['admin'], 'Only an admin can restore a backup');
    const h = here();
    state.categories = state.categories.filter((c) => c.household_id !== h);
    state.expenses = state.expenses.filter((e) => e.household_id !== h);
    const map = {};
    for (const c of categories) {
      const id = uid();
      if (c.key != null) map[c.key] = id;
      state.categories.push({
        id, household_id: h, name_ar: c.name_ar || c.name_en || 'بند', name_en: c.name_en ?? '',
        budget: Math.max(0, Number(c.budget) || 0), color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#10b981',
        sort_order: Number(c.sort_order) || 0, created_at: new Date().toISOString(),
      });
    }
    let count = 0;
    for (const e of expenses) {
      if (!(Number(e.amount) > 0)) continue;
      state.expenses.push({
        id: uid(), household_id: h, category_id: map[e.category_key] ?? null, date: e.date || localDate(),
        amount: Number(e.amount), description: e.description ?? '', payment_method: e.payment_method ?? 'cash',
        raw_input: e.raw_input ?? null, user_id: ME, created_at: new Date().toISOString(),
      });
      count++;
    }
    persist();
    return count;
  },

  // ---- members
  async listProfiles() {
    return state.memberships
      .filter((m) => m.household_id === here())
      .map((m) => ({ ...state.profiles.find((p) => p.id === m.user_id), role: m.role, created_at: m.created_at }))
      .filter((p) => p.id);
  },
  async setRole(id, role) {
    need(['admin'], 'Only an admin can change roles');
    const m = state.memberships.find((x) => x.household_id === here() && x.user_id === id);
    if (m && id !== ME) m.role = role;
    persist();
  },
  async removeMember(id) {
    need(['admin'], 'Only an admin can remove people');
    state.memberships = state.memberships.filter((m) => !(m.household_id === here() && m.user_id === id && id !== ME));
    persist();
  },
};
