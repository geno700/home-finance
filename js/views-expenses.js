// Add or edit an expense (with typed or spoken input), and the expense history.
import { html, useState, useEffect, useRef } from './lib.js';
import { db } from './data.js';
import { t } from './i18n.js';
import { parse } from './parser.js';
import {
  useLoad, usePeriod, periodRange, fmtMoney, catName, payLabel, PAYMENTS, today, toast, ask, go,
  categoryFor, customNames, changed, toCSV, download,
} from './ui.js';
import { PeriodBar, ExpenseList, Loading, Failed, Dot } from './components.js';
import { useVoice, voiceSupported, MicIcon } from './voice.js';

const blank = () => ({ amount: '', category_id: '', date: today(), description: '', payment_method: 'cash', raw_input: '' });

export function ExpenseForm({ me, household, id }) {
  const { data, error, loading } = useLoad(async () => {
    const [categories, expense] = await Promise.all([db.listCategories(), id ? db.getExpense(id) : null]);
    return { categories, expense };
  }, [id]);

  if (loading) return html`<${Loading} />`;
  if (error) return html`<${Failed} error=${error} />`;
  if (id && !data.expense) return html`<p class="state">${t('not_found')} <a href="#/history"><u>${t('back')}</u></a></p>`;
  return html`<${Form} me=${me} household=${household} categories=${data.categories} expense=${data.expense} />`;
}

function Form({ me, household, categories, expense }) {
  const editing = Boolean(expense);
  const [f, setF] = useState(() =>
    editing ? { ...expense, amount: String(expense.amount), category_id: expense.category_id ?? '' } : blank(),
  );
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const amountRef = useRef(null);
  const set = (k) => (e) => setF((old) => ({ ...old, [k]: e.target.value }));

  function read(input = text) {
    const words = input.trim();
    if (!words) return;
    const r = parse(words, { customNames: customNames(categories) });
    const cat = categoryFor(r, categories);
    setF((old) => ({
      ...old,
      amount: r.amount > 0 ? String(r.amount) : old.amount,
      category_id: cat?.id ?? old.category_id,
      date: r.date,
      description: r.description || old.description || words.slice(0, 120),
      payment_method: r.payment,
      raw_input: words,
    }));
    setNotice(r.amount > 0 ? t('smart_filled') : t('smart_no_amount'));
    if (!(r.amount > 0)) setTimeout(() => amountRef.current?.focus(), 0);
  }

  const voice = useVoice((heard, final) => {
    setText(heard);
    if (final) read(heard);
  });

  async function save(e) {
    e.preventDefault();
    if (!(Number(f.amount) > 0)) return toast(t('amount_required'), true);
    setBusy(true);
    try {
      const saved = await db.saveExpense({ ...f, amount: Number(f.amount) });
      changed();
      if (editing) {
        toast(t('updated'));
        history.length > 1 ? history.back() : go('/history');
      } else {
        toast(`${t('saved')}: ${fmtMoney(saved.amount, household.currency)}`, false, {
          label: t('undo'),
          run: async () => {
            await db.deleteExpense(saved.id);
            changed();
          },
        });
        setF(blank());
        setText('');
        setNotice('');
      }
    } catch (err) {
      toast(err.message, true);
    }
    setBusy(false);
  }

  async function remove() {
    if (!(await ask(t('delete_expense_confirm'), { ok: t('delete'), danger: true }))) return;
    try {
      await db.deleteExpense(expense.id);
      changed();
      toast(t('expense_deleted'), false, {
        label: t('undo'),
        run: async () => {
          await db.saveExpense({ ...expense, id: undefined });
          changed();
        },
      });
      go('/history');
    } catch (err) {
      toast(err.message, true);
    }
  }

  const ro = !me.canEdit;

  return html`
    <div class="page-head">
      <h1>${editing ? t('edit_title') : t('add_title')}</h1>
    </div>
    <div class="narrow">
      ${ro && html`<p class="note">${t('read_only')}</p>`}

      ${!editing &&
      !ro &&
      html`<form class="card pad form smart" onSubmit=${(e) => { e.preventDefault(); read(); }}>
        <h2>${t('smart_title')}</h2>
        <div class="smart-input">
          <input value=${text} onInput=${(e) => setText(e.target.value)} placeholder=${t('smart_hint')}
            aria-label=${t('smart_title')} enterkeyhint="go" />
          ${voiceSupported &&
          html`<button type="button" class=${'btn mic' + (voice.listening ? ' on' : '')} onClick=${voice.toggle}
            aria-label=${voice.listening ? t('mic_stop') : t('mic_start')} title=${voice.listening ? t('mic_stop') : t('mic_start')}>
            <${MicIcon} />
          </button>`}
          <button class="btn primary" disabled=${!text.trim()}>${t('smart_read')}</button>
        </div>
        ${voice.listening && html`<p class="small muted">${t('mic_listening')}</p>`}
        ${voice.error && html`<p class="error">${voice.error}</p>`}
        ${notice && html`<p class="small ok-text">${notice}</p>`}
        ${!notice && !voice.listening && html`<p class="small muted">${t('smart_private')}</p>`}
      </form>`}

      <form class="card pad form" onSubmit=${save}>
        <fieldset disabled=${ro || busy}>
          <div class="grid2">
            <label>
              <span>${t('amount')} (${household.currency})</span>
              <input ref=${amountRef} type="number" inputmode="decimal" min="0.01" step="0.01" required
                value=${f.amount} onInput=${set('amount')} class="big-input num" />
            </label>
            <label>
              <span>${t('date')}</span>
              <input type="date" required value=${f.date} onInput=${set('date')} />
            </label>
          </div>
          <label>
            <span>${t('category')}</span>
            <select value=${f.category_id ?? ''} onChange=${set('category_id')}>
              <option value="">${t('no_category')}</option>
              ${categories.map((c) => html`<option value=${c.id} key=${c.id}>${catName(c)}</option>`)}
            </select>
          </label>
          <label>
            <span>${t('description')}</span>
            <input maxlength="300" value=${f.description} onInput=${set('description')} placeholder=${t('description_placeholder')} />
          </label>
          <div>
            <span class="field-label">${t('payment')}</span>
            <div class="chips">
              ${PAYMENTS.map(
                (k) => html`<button type="button" key=${k} class=${'chip' + (f.payment_method === k ? ' on' : '')}
                  aria-pressed=${f.payment_method === k} onClick=${() => setF((old) => ({ ...old, payment_method: k }))}>
                  ${payLabel(k)}
                </button>`,
              )}
            </div>
          </div>
          <div class="actions">
            <button class="btn primary big">${editing ? t('save') : t('save_expense')}</button>
            ${editing && html`<button type="button" class="btn" onClick=${() => history.back()}>${t('cancel')}</button>`}
          </div>
        </fieldset>
        ${editing &&
        html`<div class="form-foot">
          ${expense.user_name && html`<span class="muted small">${t('added_by', { name: expense.user_name })}</span>`}
          ${me.canEdit && html`<button type="button" class="btn small danger" onClick=${remove}>${t('delete')}</button>`}
        </div>`}
      </form>
    </div>
  `;
}

export function History({ household, query }) {
  const [p, setP] = usePeriod();
  const range = periodRange(p);
  const { data, error, loading } = useLoad(
    async () => {
      const [categories, expenses] = await Promise.all([db.listCategories(), db.listExpenses(range)]);
      return { categories, expenses };
    },
    [range.from, range.to],
  );
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(query.get('cat') ?? '');
  const [pay, setPay] = useState('');
  const [sort, setSort] = useState('newest');
  useEffect(() => setCat(query.get('cat') ?? ''), [query.get('cat')]);

  const head = html`
    <div class="page-head">
      <h1>${t('history_title')}</h1>
      ${data && html`<button class="btn" onClick=${() => exportCsv(shown, data.categories, household)}>${t('export_csv')}</button>`}
    </div>
    <${PeriodBar} p=${p} setP=${setP} />
  `;
  if (loading) return html`${head}<${Loading} />`;
  if (error) return html`${head}<${Failed} error=${error} />`;

  const { categories, expenses } = data;
  const needle = q.trim().toLowerCase();
  const shown = expenses.filter(
    (e) =>
      (!cat || (cat === 'none' ? !e.category_id : e.category_id === cat)) &&
      (!pay || e.payment_method === pay) &&
      (!needle || [e.description, e.raw_input, e.user_name].join(' ').toLowerCase().includes(needle)),
  );
  const sorters = {
    newest: (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
    oldest: (a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at),
    highest: (a, b) => b.amount - a.amount,
    lowest: (a, b) => a.amount - b.amount,
  };
  shown.sort(sorters[sort]);
  const total = shown.reduce((s, e) => s + e.amount, 0);
  const selected = categories.find((c) => c.id === cat);

  return html`
    ${head}
    <div class="filters">
      <input type="search" placeholder=${t('search')} value=${q} onInput=${(e) => setQ(e.target.value)} />
      <select value=${cat} onChange=${(e) => setCat(e.target.value)} aria-label=${t('category')}>
        <option value="">${t('all_categories')}</option>
        ${categories.map((c) => html`<option value=${c.id} key=${c.id}>${catName(c)}</option>`)}
        <option value="none">${t('no_category')}</option>
      </select>
      <select value=${pay} onChange=${(e) => setPay(e.target.value)} aria-label=${t('payment')}>
        <option value="">${t('all_payments')}</option>
        ${PAYMENTS.map((k) => html`<option value=${k} key=${k}>${payLabel(k)}</option>`)}
      </select>
      <select value=${sort} onChange=${(e) => setSort(e.target.value)} aria-label="Sort">
        ${Object.keys(sorters).map((k) => html`<option value=${k} key=${k}>${t('sort_' + k)}</option>`)}
      </select>
    </div>
    ${selected && html`<p class="filter-note"><${Dot} color=${selected.color} /> ${catName(selected)}</p>`}
    <div class="tiles three">
      <div class="card tile"><div class="label">${t('count')}</div><div class="value">${shown.length}</div></div>
      <div class="card tile"><div class="label">${t('total')}</div><div class="value">${fmtMoney(total, household.currency)}</div></div>
      <div class="card tile">
        <div class="label">${t('average')}</div>
        <div class="value">${fmtMoney(shown.length ? total / shown.length : 0, household.currency)}</div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <${ExpenseList} expenses=${shown} categories=${categories} currency=${household.currency} />
    </div>
    <p class="muted small" style="margin-top:10px">${t('shown_of', { shown: shown.length, total: expenses.length })}</p>
  `;
}

function exportCsv(rows, categories, household) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  download(
    `expenses-${today()}.csv`,
    toCSV(
      ['date', 'category', 'description', 'amount', 'currency', 'payment', 'person'],
      rows.map((e) => [
        e.date, catName(byId.get(e.category_id)), e.description, e.amount, household.currency,
        payLabel(e.payment_method), e.user_name,
      ]),
    ),
  );
}
