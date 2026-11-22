// Budget categories: monthly budget per category, with this month's spending.
import { html, useState } from './lib.js';
import { db } from './data.js';
import { t } from './i18n.js';
import { useLoad, periodRange, fmtMoney, fmtNum, catName, toast, ask, changed } from './ui.js';
import { Bar, Dot, Loading, Failed } from './components.js';

const SWATCHES = ['#3b82f6', '#eab308', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#22c55e', '#ec4899', '#8b5cf6', '#f43f5e', '#64748b', '#0f766e'];

export function Categories({ me, household }) {
  const now = new Date();
  const range = periodRange({ mode: 'month', y: now.getFullYear(), m: now.getMonth() });
  const { data, error, loading, reload } = useLoad(async () => {
    const [categories, expenses] = await Promise.all([db.listCategories(), db.listExpenses(range)]);
    return { categories, expenses };
  });
  const [editing, setEditing] = useState(null); // null | 'new' | category

  if (loading) return html`<${Loading} />`;
  if (error) return html`<${Failed} error=${error} />`;

  const { categories, expenses } = data;
  const spentBy = new Map();
  for (const e of expenses) spentBy.set(e.category_id, (spentBy.get(e.category_id) ?? 0) + e.amount);
  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const cur = household.currency;

  return html`
    <div class="page-head">
      <h1>${t('categories_title')}</h1>
      ${me.canEdit && html`<button class="btn primary" onClick=${() => setEditing('new')}>${t('add_category')}</button>`}
    </div>
    <p class="muted" style="margin-bottom:14px">${t('budget_total_hint', { amount: fmtMoney(totalBudget, cur) })}</p>
    <div class="card list">
      ${categories.map((c) => {
        const s = spentBy.get(c.id) ?? 0;
        return html`
          <div class="row cat" key=${c.id}>
            <${Dot} color=${c.color} />
            <div class="main">
              <div class="cat-line">
                <span class="title">${catName(c)}</span>
                <span class="num"><strong>${fmtMoney(c.budget, cur)}</strong></span>
              </div>
              <${Bar} spent=${s} budget=${c.budget} color=${c.color} />
              <div class=${'sub ' + (s > c.budget ? 'over' : '')}>
                ${t('this_month_spent')}: ${fmtNum(s)} (${c.budget > 0 ? Math.round((s / c.budget) * 100) : 0}%)
              </div>
            </div>
            ${me.canEdit && html`<button class="btn small" onClick=${() => setEditing(c)}>${t('edit')}</button>`}
          </div>
        `;
      })}
    </div>
    ${editing &&
    html`<${CategoryEditor}
      me=${me}
      category=${editing === 'new' ? null : editing}
      currency=${cur}
      onClose=${(didChange) => {
        setEditing(null);
        if (didChange) {
          reload();
          changed();
        }
      }}
    />`}
  `;
}

function CategoryEditor({ me, category, currency, onClose }) {
  const [f, setF] = useState(
    category ? { ...category, budget: String(category.budget) } : { name_ar: '', name_en: '', budget: '', color: SWATCHES[11] },
  );
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    if (!f.name_ar.trim() && !f.name_en.trim()) return toast(t('name_required'), true);
    setBusy(true);
    try {
      // Arabic name is required by the database; use the English one when only that was typed.
      await db.saveCategory({ ...f, name_ar: f.name_ar.trim() || f.name_en.trim(), budget: Number(f.budget) || 0 });
      toast(t('category_saved'));
      onClose(true);
    } catch (err) {
      toast(err.message, true);
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await ask(t('delete_category_confirm', { name: catName(category) }), { ok: t('delete'), danger: true }))) return;
    try {
      await db.deleteCategory(category.id);
      toast(t('category_deleted'));
      onClose(true);
    } catch (err) {
      toast(err.message, true);
    }
  }

  return html`
    <div class="overlay" onClick=${(e) => e.target === e.currentTarget && onClose(false)}>
      <form class="modal form" onSubmit=${save}>
        <h2>${category ? t('edit_category') : t('new_category')}</h2>
        <label><span>${t('name_ar')}</span><input dir="rtl" maxlength="80" value=${f.name_ar} onInput=${set('name_ar')} /></label>
        <label><span>${t('name_en')}</span><input dir="ltr" maxlength="80" value=${f.name_en} onInput=${set('name_en')} /></label>
        <label>
          <span>${t('monthly_budget')} (${currency})</span>
          <input type="number" inputmode="decimal" min="0" step="1" value=${f.budget} onInput=${set('budget')} class="num" />
        </label>
        <div>
          <span class="field-label">${t('color')}</span>
          <div class="swatches">
            ${SWATCHES.map(
              (c) => html`<button type="button" key=${c} class=${'swatch' + (f.color === c ? ' on' : '')} style=${{ background: c }}
                aria-label=${c} aria-pressed=${f.color === c} onClick=${() => setF({ ...f, color: c })}></button>`,
            )}
          </div>
        </div>
        <div class="actions">
          <button class="btn primary" disabled=${busy}>${t('save')}</button>
          <button type="button" class="btn" onClick=${() => onClose(false)}>${t('cancel')}</button>
          ${category && me.isAdmin &&
          html`<button type="button" class="btn danger push" onClick=${remove}>${t('delete')}</button>`}
        </div>
      </form>
    </div>
  `;
}
