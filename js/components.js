// Small pieces used on several pages.
import { html } from './lib.js';
import { t, isAr } from './i18n.js';
import { periodLabel, shiftPeriod, fmtMoney, fmtDate, catName, payLabel } from './ui.js';

const now = new Date();

// Month or year picker: ‹ November 2026 ›  [Monthly | Yearly]
export function PeriodBar({ p, setP }) {
  const current = p.mode === 'year' ? p.y === now.getFullYear() : p.y === now.getFullYear() && p.m === now.getMonth();
  // In right-to-left text "previous" sits on the right, so the arrows swap.
  const prevArrow = isAr ? '›' : '‹';
  const nextArrow = isAr ? '‹' : '›';
  return html`
    <div class="period">
      <div class="period-step">
        <button class="btn small icon" aria-label=${t('prev')} onClick=${() => setP(shiftPeriod(p, -1))}>${prevArrow}</button>
        <strong class="period-label">${periodLabel(p)}</strong>
        <button class="btn small icon" aria-label=${t('next')} onClick=${() => setP(shiftPeriod(p, 1))}>${nextArrow}</button>
        ${!current &&
        html`<button class="link" onClick=${() => setP({ ...p, y: now.getFullYear(), m: now.getMonth() })}>
          ${t('this_month')}
        </button>`}
      </div>
      <div class="seg" role="group">
        <button class=${p.mode === 'month' ? 'on' : ''} aria-pressed=${p.mode === 'month'}
          onClick=${() => setP({ ...p, mode: 'month' })}>${t('monthly')}</button>
        <button class=${p.mode === 'year' ? 'on' : ''} aria-pressed=${p.mode === 'year'}
          onClick=${() => setP({ ...p, mode: 'year' })}>${t('yearly')}</button>
      </div>
    </div>
  `;
}

// Progress bar for spent against budget. Turns amber near the limit and red past it.
export function Bar({ spent, budget, color }) {
  const pct = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
  const state = pct > 100 ? 'over' : pct >= 85 ? 'near' : '';
  return html`
    <div class=${'bar ' + state} role="img" aria-label=${Math.round(pct) + '%'}>
      <span style=${{ width: Math.min(pct, 100) + '%', background: state ? undefined : color }}></span>
    </div>
  `;
}

export function Dot({ color }) {
  return html`<span class="dot" style=${{ background: color || 'var(--muted)' }}></span>`;
}

export function ExpenseList({ expenses, categories, currency, showDate = true }) {
  if (!expenses.length) return html`<p class="empty">${t('no_expenses')}</p>`;
  const byId = new Map(categories.map((c) => [c.id, c]));
  return html`
    <div class="list">
      ${expenses.map((e) => {
        const c = byId.get(e.category_id);
        return html`
          <a class="row" href=${'#/expenses/' + e.id} key=${e.id}>
            <${Dot} color=${c?.color} />
            <div class="main">
              <div class="title">${e.description || catName(c)}</div>
              <div class="sub">
                ${[catName(c), showDate && fmtDate(e.date), payLabel(e.payment_method), e.user_name].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div class="amount num">${fmtMoney(e.amount, currency)}</div>
          </a>
        `;
      })}
    </div>
  `;
}

export const Loading = () => html`<p class="state">${t('loading')}</p>`;
export const Failed = ({ error }) => html`<p class="state">${t('went_wrong', { msg: error.message })}</p>`;
