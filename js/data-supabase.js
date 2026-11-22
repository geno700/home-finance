// Live data source: Supabase (Postgres + logins). Same API as data-demo.js.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { config } from '../config.js';

// A password-reset link brings the person back with this marker in the address.
let recovery = location.hash.includes('type=recovery');

// All of this app's tables live in their own schema (see supabase/schema.sql).
const sb = createClient(config.supabaseUrl, config.supabaseAnonKey, { db: { schema: config.dbSchema || 'finance' } });

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// The household the person is working in. Every query below is limited to it.
let hh = null;
const here = () => {
  if (!hh) throw new Error('Choose a household first');
  return hh;
};

const EXP_SEL = 'id, date, amount, description, payment_method, raw_input, category_id, user_id, created_at, user:profiles(full_name, email)';
const flatExpense = (r) => ({
  ...r,
  amount: Number(r.amount),
  user_name: r.user?.full_name || r.user?.email || '',
  user: undefined,
});
const flatCategory = (c) => ({ ...c, budget: Number(c.budget) });

export default {
  async getUser() {
    const { data } = await sb.auth.getSession();
    return data.session?.user ?? null;
  },
  onAuthChange(cb) {
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') recovery = true;
      // Token refreshes happen in the background and need no reload.
      if (event === 'TOKEN_REFRESHED') return;
      setTimeout(cb, 0);
    });
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    ok(await sb.auth.signInWithPassword({ email, password }));
  },
  async signUp(email, password, fullName) {
    const data = ok(
      await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: location.origin + location.pathname },
      }),
    );
    return { needsConfirm: !data.session };
  },
  async signOut() {
    await sb.auth.signOut();
  },
  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;
    let profile = ok(await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
    if (!profile) {
      // Signed up through another app that shares this Supabase project: create the profile here.
      ok(await sb.rpc('ensure_profile'));
      profile = ok(await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
    }
    return profile ?? { id: user.id, email: user.email };
  },
  async sendPasswordReset(email) {
    ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
  },
  inRecovery: () => recovery,
  async setPassword(password) {
    ok(await sb.auth.updateUser({ password }));
    recovery = false;
  },

  // ---- households
  async listHouseholds() {
    const user = await this.getUser();
    if (!user) return [];
    const rows = ok(
      await sb.from('memberships').select('role, created_at, household:households(id, name, currency, join_code)')
        .eq('user_id', user.id).order('created_at'),
    );
    return rows.filter((r) => r.household).map((r) => ({ ...r.household, role: r.role }));
  },
  useHousehold(id) {
    hh = id;
  },
  async createHousehold(name, currency) {
    return ok(await sb.rpc('create_household', { p_name: name, p_currency: currency }));
  },
  async joinHousehold(code) {
    return ok(await sb.rpc('join_household', { p_code: code }));
  },
  async updateHousehold({ name, currency }) {
    const fields = {};
    if (name !== undefined) fields.name = name.trim();
    if (currency !== undefined) fields.currency = currency.trim();
    ok(await sb.from('households').update(fields).eq('id', here()));
  },
  async newJoinCode() {
    return ok(await sb.rpc('new_join_code', { p_household: here() }));
  },
  async deleteHousehold(id) {
    const gone = ok(await sb.from('households').delete().eq('id', id).select('id'));
    if (!gone.length) throw new Error('Only an admin can delete a household');
  },
  async leaveHousehold(id) {
    const user = await this.getUser();
    const gone = ok(await sb.from('memberships').delete().eq('household_id', id).eq('user_id', user.id).select('user_id'));
    if (!gone.length) throw new Error('An admin cannot leave their own household');
  },

  // ---- categories
  async listCategories() {
    return ok(
      await sb.from('categories').select('*').eq('household_id', here()).order('sort_order').order('created_at'),
    ).map(flatCategory);
  },
  async saveCategory(f) {
    const fields = {
      name_ar: f.name_ar.trim(), name_en: (f.name_en ?? '').trim(), budget: Number(f.budget) || 0, color: f.color,
    };
    if (f.sort_order !== undefined) fields.sort_order = f.sort_order;
    const q = f.id
      ? sb.from('categories').update(fields).eq('id', f.id).eq('household_id', here())
      : sb.from('categories').insert({ ...fields, household_id: here() });
    return flatCategory(ok(await q.select('*').single()));
  },
  async deleteCategory(id) {
    const gone = ok(await sb.from('categories').delete().eq('id', id).eq('household_id', here()).select('id'));
    if (!gone.length) throw new Error('Only an admin can delete a category');
  },

  // ---- expenses
  async listExpenses({ from, to } = {}) {
    // Supabase returns at most 1000 rows per request, so read in pages.
    const rows = [];
    for (let start = 0; ; start += 1000) {
      let q = sb.from('expenses').select(EXP_SEL).eq('household_id', here())
        .order('date', { ascending: false }).order('created_at', { ascending: false }).range(start, start + 999);
      if (from) q = q.gte('date', from);
      if (to) q = q.lte('date', to);
      const page = ok(await q);
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows.map(flatExpense);
  },
  async getExpense(id) {
    const r = ok(await sb.from('expenses').select(EXP_SEL).eq('household_id', here()).eq('id', id).maybeSingle());
    return r && flatExpense(r);
  },
  async saveExpense(f) {
    const fields = {
      date: f.date, amount: Number(f.amount), description: (f.description ?? '').trim(),
      payment_method: f.payment_method, category_id: f.category_id || null,
    };
    let q;
    if (f.id) q = sb.from('expenses').update(fields).eq('id', f.id).eq('household_id', here());
    else {
      const user = await this.getUser();
      q = sb.from('expenses').insert({ ...fields, raw_input: f.raw_input || null, household_id: here(), user_id: user.id });
    }
    return flatExpense(ok(await q.select(EXP_SEL).single()));
  },
  async deleteExpense(id) {
    ok(await sb.from('expenses').delete().eq('id', id).eq('household_id', here()));
  },

  // Replaces this household's categories and expenses with the ones from a backup file.
  async importBackup({ categories, expenses }) {
    return ok(
      await sb.rpc('import_backup', {
        p_household: here(), p_categories: categories, p_expenses: expenses, p_replace: true,
      }),
    );
  },

  // ---- members of the current household
  async listProfiles() {
    const rows = ok(
      await sb.from('memberships').select('role, created_at, user:profiles(id, email, full_name)')
        .eq('household_id', here()).order('created_at'),
    );
    return rows.filter((r) => r.user).map((r) => ({ ...r.user, role: r.role, created_at: r.created_at }));
  },
  async setRole(id, role) {
    ok(await sb.from('memberships').update({ role }).eq('household_id', here()).eq('user_id', id));
  },
  async removeMember(id) {
    ok(await sb.from('memberships').delete().eq('household_id', here()).eq('user_id', id));
  },
};
