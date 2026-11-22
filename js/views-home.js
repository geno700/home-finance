// Dashboard: budget against spending for a month or a year.
import { html } from './lib.js';
import { db } from './data.js';
import { t } from './i18n.js';
import { useLoad, usePeriod, periodRange, budgetFor, fmtMoney, fmtNum, catName, payLabel, PAYMENTS } from './ui.js';
import { PeriodBar, Bar, Dot, ExpenseList, Loading, Failed } from './components.js';

export function Dashboard({ me, household }) {
  const [p, setP] = usePeriod();
  const range = periodRange(p);
  const { data, error, loading } = useLoad(
    async () => {
      const [categories, expenses] = await Promise.all([db.listCategories(), db.listExpenses(range)]);
      return { categories, expenses };
    },
    [range.from, range.to],
  );

  const cur = household.currency;
  const head = html`
    <h1 class="sr-only">${household.name}</h1>
    <${PeriodBar} p=${p} setP=${setP} />
  `;
  if (loading) return html`${head}<${Loading} />`;
  if (error) return html`${head}<${Failed} error=${error} />`;

  const { categories, expenses } = data;
  const spentBy = new Map();
  for (const e of expenses) spentBy.set(e.category_id, (spentBy.get(e.category_id) ?? 0) + e.amount);

  const budget = categories.reduce((s, c) => s + budgetFor(c.budget, p), 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const left = budget - spent;
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const rows = categories.map((c) => ({ c, spent: spentBy.get(c.id) ?? 0, budget: budgetFor(c.budget, p) }));
  const overCount = rows.filter((r) => r.spent > r.budget).length;
  const status = left < 0 ? 'danger' : pct >= 85 || overCount ? 'warning' : 'good';
  const statusText =
    status === 'danger'
      ? t('status_danger', { amount: fmtMoney(-left, cur) })
      : overCount && pct < 85
        ? t('status_cats_over', { count: overCount })
        : t('status_' + status);

  const loose = spentBy.get(null) ?? 0;
  // Over-budget categories first, then the biggest spenders.
  rows.sort((a, b) => (b.spent > b.budget) - (a.spent > a.budget) || b.spent - a.spent);

  const byPay = PAYMENTS.map((k) => [k, expenses.filter((e) => e.payment_method === k).reduce((s, e) => s + e.amount, 0)])
    .filter(([, v]) => v > 0);

  return html`
    ${head}
    <div class="tiles">
      <div class="card tile"><div class="label">${t('total_budget')}</div><div class="value">${fmtMoney(budget, cur)}</div></div>
      <div class="card tile"><div class="label">${t('total_spent')}</div><div class="value">${fmtMoney(spent, cur)}</div></div>
      <div class=${'card tile' + (left < 0 ? ' alert' : ' good')}>
        <div class="label">${left < 0 ? t('deficit') : t('surplus')}</div>
        <div class="value">${fmtMoney(Math.abs(left), cur)}</div>
      </div>
      <div class=${'card tile' + (status === 'danger' ? ' alert' : '')}>
        <div class="label">${t('consumption')}</div>
        <div class="value">${Math.round(pct)}<small>%</small></div>
      </div>
    </div>

    <div class=${'status ' + status}>${statusText}</div>

    <section class="section">
      <h2>${t('by_category')}</h2>
      <div class="card list">
        ${rows.map(
          ({ c, spent: s, budget: b }) => html`
            <a class="row cat" href=${'#/history?cat=' + c.id} key=${c.id}>
              <${Dot} color=${c.color} />
              <div class="main">
                <div class="cat-line">
                  <span class="title">${catName(c)}</span>
                  <span class="num small">${t('spent_of', { spent: fmtNum(s), budget: fmtMoney(b, cur) })}</span>
                </div>
                <${Bar} spent=${s} budget=${b} color=${c.color} />
                <div class=${'sub ' + (s > b ? 'over' : '')}>
                  ${s > b ? t('over_by', { amount: fmtMoney(s - b, cur) }) : t('left_amount', { amount: fmtMoney(b - s, cur) })}
                </div>
              </div>
            </a>
          `,
        )}
        ${loose > 0 &&
        html`<div class="row">
          <${Dot} />
          <div class="main"><span class="title">${t('no_category')}</span></div>
          <div class="amount num">${fmtMoney(loose, cur)}</div>
        </div>`}
      </div>
    </section>

    ${byPay.length > 0 &&
    html`<section class="section">
      <h2>${t('by_payment')}</h2>
      <div class="card pad pays">
        ${byPay.map(
          ([k, v]) => html`<div key=${k}>
            <div class="label">${payLabel(k)}</div>
            <div class="num"><strong>${fmtMoney(v, cur)}</strong> <span class="muted small">${Math.round((v / spent) * 100)}%</span></div>
          </div>`,
        )}
      </div>
    </section>`}

    <section class="section">
      <div class="section-head">
        <h2>${t('recent')}</h2>
        ${expenses.length > 0 && html`<a class="link" href="#/history">${t('see_all')}</a>`}
      </div>
      <div class="card">
        ${expenses.length
          ? html`<${ExpenseList} expenses=${expenses.slice(0, 6)} categories=${categories} currency=${cur} />`
          : html`<div class="empty">
              <p>${t('no_expenses')}</p>
              ${me.canEdit && html`<p style="margin-top:12px"><a class="btn primary" href="#/add">${t('add_first')}</a></p>`}
            </div>`}
      </div>
    </section>
  `;
}
