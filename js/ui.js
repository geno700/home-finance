// Shared constants, formatters and small hooks.
import { useState, useEffect } from './lib.js';
import { config } from '../config.js';
import { t, isAr } from './i18n.js';
import { localDate } from './parser.js';
import { PAYMENTS, PAYMENT_AR, DEFAULT_CATEGORIES } from './constants.js';

export { PAYMENTS, PAYMENT_AR, DEFAULT_CATEGORIES };
export const payLabel = (key) => t('pay_' + key);

export const ROLES = ['pending', 'viewer', 'member', 'admin'];
export const roleLabel = (role) => t('role_' + role);

export const catName = (c) => (c ? (isAr ? c.name_ar : c.name_en || c.name_ar) : t('no_category'));

// Household category names, for the parser to match categories the family added themselves.
export const customNames = (categories) =>
  categories.map((c) => ({ id: c.id, names: [c.name_ar, c.name_en] }));

// Turns the parser's result into one of this household's categories.
// A category the family named in the text wins; then the built-in kind is matched by its default name.
export function categoryFor(result, categories) {
  if (result.customId) return categories.find((c) => c.id === result.customId) ?? null;
  const def = DEFAULT_CATEGORIES.find((d) => d.key === result.kind);
  if (!def) return null;
  return categories.find((c) => c.name_ar === def.name_ar || (c.name_en && c.name_en === def.name_en)) ?? null;
}

// ---------- numbers and dates ----------

export const fmtNum = (n, digits = 0) =>
  Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 });

export const fmtMoney = (n, currency = '') => (currency ? `${fmtNum(n)} ${currency}` : fmtNum(n));

const LOCALE = isAr ? 'ar-EG-u-nu-latn' : 'en-GB';

// 'YYYY-MM-DD' -> '22 Nov 2026', shown as a local calendar date (no time zone shifts).
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const monthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });

export const today = () => localDate();

// ---------- the period being looked at (shared by the dashboard and history) ----------

const now = new Date();
let period = { mode: 'month', y: now.getFullYear(), m: now.getMonth() };

export function usePeriod() {
  const [p, setP] = useState(period);
  const set = (next) => {
    period = next;
    setP(next);
  };
  return [p, set];
}

export function periodRange(p) {
  if (p.mode === 'year') return { from: `${p.y}-01-01`, to: `${p.y}-12-31` };
  const last = new Date(p.y, p.m + 1, 0).getDate();
  const mm = String(p.m + 1).padStart(2, '0');
  return { from: `${p.y}-${mm}-01`, to: `${p.y}-${mm}-${String(last).padStart(2, '0')}` };
}

export function shiftPeriod(p, dir) {
  if (p.mode === 'year') return { ...p, y: p.y + dir };
  const d = new Date(p.y, p.m + dir, 1);
  return { ...p, y: d.getFullYear(), m: d.getMonth() };
}

export const periodLabel = (p) => (p.mode === 'year' ? String(p.y) : monthLabel(p.y, p.m));
// Budgets are monthly; a year view counts twelve of them.
export const budgetFor = (monthly, p) => Number(monthly ?? 0) * (p.mode === 'year' ? 12 : 1);

// ---------- households ----------

const CURRENT_KEY = 'home-finance-current';
export function lastHousehold() {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}
export function rememberHousehold(id) {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // Storage blocked: the first household is used on the next visit.
  }
}
export function switchHousehold(id) {
  rememberHousehold(id);
  location.hash = '#/';
  location.reload();
}

export const appBase = () => config.appUrl || location.origin + location.pathname;

// ---------- voice language ----------

const VOICE_KEY = 'home-finance-voice';
export const VOICE_LANGS = [
  ['ar-EG', 'العامية المصرية (ar-EG)', 'Egyptian Arabic (ar-EG)'],
  ['ar-SA', 'العربية الفصحى (ar-SA)', 'Standard Arabic (ar-SA)'],
  ['en-US', 'الإنجليزية (en-US)', 'English (en-US)'],
];
export function voiceLang() {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    if (VOICE_LANGS.some(([k]) => k === v)) return v;
  } catch {
    // Storage blocked: use the default.
  }
  return isAr ? 'ar-EG' : 'en-US';
}
export function setVoiceLang(v) {
  try {
    localStorage.setItem(VOICE_KEY, v);
  } catch {
    // Storage blocked: the choice lasts until the page is closed.
  }
}

// ---------- feedback ----------

export const go = (path) => {
  location.hash = path;
};

// action: optional { label, run } shown as a button inside the toast.
export function toast(message, bad = false, action = null) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (bad ? ' bad' : '');
  el.textContent = message;
  if (action) {
    const button = document.createElement('button');
    button.textContent = action.label;
    button.onclick = () => {
      el.remove();
      action.run();
    };
    el.append(button);
  }
  host.append(el);
  setTimeout(() => el.remove(), action ? 8000 : bad ? 5000 : 2500);
}

// In-app question box. Browsers' own prompt() and confirm() are blocked in some places.
// With { input: true } it resolves to the typed text (null if cancelled); otherwise to true or false.
export function ask(message, { input = false, value = '', ok = t('ok'), danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const box = document.createElement('form');
    box.className = 'modal form ask';
    const text = document.createElement('p');
    text.textContent = message;
    box.append(text);
    let field = null;
    if (input) {
      field = document.createElement('input');
      field.value = value;
      field.setAttribute('aria-label', message);
      box.append(field);
    }
    const actions = document.createElement('div');
    actions.className = 'actions';
    const yes = document.createElement('button');
    yes.className = 'btn primary' + (danger ? ' danger-fill' : '');
    yes.textContent = ok;
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'btn';
    no.textContent = t('cancel');
    actions.append(yes, no);
    box.append(actions);
    overlay.append(box);

    const done = (result) => {
      removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(result);
    };
    const cancel = () => done(input ? null : false);
    const onKey = (e) => e.key === 'Escape' && cancel();
    box.onsubmit = (e) => {
      e.preventDefault();
      done(input ? field.value : true);
    };
    no.onclick = cancel;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cancel();
    });
    addEventListener('keydown', onKey);
    document.body.append(overlay);
    (field ?? yes).focus();
    field?.select();
  });
}

// ---------- files ----------

export function toCSV(headers, rows) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    // Stop spreadsheet apps from running text cells as formulas.
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = "'" + s;
    return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

export function download(filename, text, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Runs an async loader and tracks { data, error, loading }; reload() runs it again.
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fn().then(
      (data) => live && setState({ data, loading: false }),
      (error) => live && setState({ error, loading: false }),
    );
    return () => {
      live = false;
    };
  }, [...deps, tick]);
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    addEventListener('data-changed', again);
    return () => removeEventListener('data-changed', again);
  }, []);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

export const changed = () => dispatchEvent(new Event('data-changed'));
