// Households (start, join, switch), members and invites, and settings with backup.
import { html, useState, useRef } from './lib.js';
import { db, demoMode } from './data.js';
import { t, lang, setLang, isAr } from './i18n.js';
import {
  ROLES, roleLabel, toast, ask, switchHousehold, appBase, useLoad, download, today, changed, VOICE_LANGS, voiceLang,
  setVoiceLang,
} from './ui.js';
import { buildBackup, readBackup } from './backup.js';
import { Loading, Failed } from './components.js';

// Used on the welcome screen, the waiting screen and the Households page.
export function HouseholdManager({ households, current, onChange }) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(isAr ? 'ج.م' : 'EGP');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast(err.message, true);
    }
    setBusy(false);
  }

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      const h = await db.createHousehold(name, currency);
      switchHousehold(h.id);
    });
  };

  const join = (e) => {
    e.preventDefault();
    run(async () => {
      const h = await db.joinHousehold(code);
      setCode('');
      const known = households.find((x) => x.id === h.id);
      toast(known && known.role !== 'pending' ? t('already_in', { name: h.name }) : t('request_sent', { name: h.name }));
      await onChange();
    });
  };

  const leave = async (h) => {
    if (!(await ask(t('leave_confirm', { name: h.name }), { ok: t('leave'), danger: true }))) return;
    run(async () => {
      await db.leaveHousehold(h.id);
      toast(t('left', { name: h.name }));
      if (h.id === current?.id) location.hash = '#/';
      await onChange();
    });
  };

  const remove = async (h) => {
    const typed = await ask(t('delete_household_confirm', { name: h.name }), { input: true, ok: t('delete_household'), danger: true });
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== h.name.trim().toLowerCase()) return toast(t('name_mismatch'), true);
    run(async () => {
      await db.deleteHousehold(h.id);
      toast(t('deleted_named', { name: h.name }));
      if (h.id === current?.id) location.hash = '#/';
      await onChange();
    });
  };

  return html`
    ${households.length > 0 &&
    html`<div class="card list" style="margin-bottom:16px">
      ${households.map(
        (h) => html`
          <div class="row wrap" key=${h.id}>
            <div class="main">
              <div class="title">${h.name} ${h.id === current?.id && html`<span class="badge">${t('open_now')}</span>`}</div>
              <div class="sub">${roleLabel(h.role)}</div>
            </div>
            <div class="actions">
              ${h.id !== current?.id && h.role !== 'pending' &&
              html`<button class="btn small" onClick=${() => switchHousehold(h.id)}>${t('open')}</button>`}
              ${h.role === 'admin' &&
              html`<button class="btn small danger" disabled=${busy} onClick=${() => remove(h)}>${t('delete')}</button>`}
              ${h.role !== 'admin' &&
              html`<button class="btn small" disabled=${busy} onClick=${() => leave(h)}>
                ${h.role === 'pending' ? t('cancel_request') : t('leave')}
              </button>`}
            </div>
          </div>
        `,
      )}
    </div>`}

    <form class="card pad form" style="margin-bottom:16px" onSubmit=${join}>
      <h2>${t('join_title')}</h2>
      <p class="muted small">${t('join_hint')}</p>
      <label>
        <span>${t('join_code')}</span>
        <input required dir="ltr" value=${code} onInput=${(e) => setCode(e.target.value)} placeholder="4F7A21C9"
          autocapitalize="characters" autocomplete="off" />
      </label>
      <button class="btn primary" disabled=${busy || !code.trim()}>${t('ask_to_join')}</button>
    </form>

    <form class="card pad form" onSubmit=${create}>
      <h2>${t('start_title')}</h2>
      <p class="muted small">${t('start_hint')}</p>
      <div class="grid2 wide-first">
        <label>
          <span>${t('household_name')}</span>
          <input required maxlength="80" value=${name} onInput=${(e) => setName(e.target.value)} placeholder=${t('household_placeholder')} />
        </label>
        <label>
          <span>${t('currency')}</span>
          <input required maxlength="12" value=${currency} onInput=${(e) => setCurrency(e.target.value)} />
        </label>
      </div>
      <button class="btn primary" disabled=${busy || !name.trim()}>${t('create_household')}</button>
    </form>
  `;
}

export function Households({ households, current, onChange }) {
  return html`
    <div class="page-head"><h1>${t('households')}</h1></div>
    <div class="narrow">
      <${HouseholdManager} households=${households} current=${current} onChange=${onChange} />
    </div>
  `;
}

export function Team({ me, household, onChange }) {
  const { data: people, error, loading, reload } = useLoad(() => db.listProfiles());
  const [code, setCode] = useState(household.join_code);

  if (loading) return html`<${Loading} />`;
  if (error) return html`<${Failed} error=${error} />`;

  const link = appBase() + '?join=' + code;

  async function attempt(fn) {
    try {
      await fn();
    } catch (err) {
      toast(err.message, true);
    }
  }
  const who = (p) => p.full_name || p.email;
  const change = (person, role) =>
    attempt(async () => {
      await db.setRole(person.id, role);
      toast(t('role_changed', { name: who(person), role: roleLabel(role) }));
    }).then(reload);
  const remove = async (person) => {
    if (!(await ask(t('remove_confirm', { name: who(person), household: household.name }), { ok: t('remove'), danger: true }))) return;
    attempt(async () => {
      await db.removeMember(person.id);
      toast(t('removed', { name: who(person) }));
    }).then(reload);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(t('link_copied'));
    } catch {
      ask(t('copy_by_hand'), { input: true, value: link });
    }
  };
  const newCode = async () => {
    if (!(await ask(t('new_code_confirm'), { ok: t('new_code') }))) return;
    attempt(async () => {
      setCode(await db.newJoinCode());
      toast(t('new_code_done'));
      onChange();
    });
  };
  const rename = async () => {
    const name = (await ask(t('household_name'), { input: true, value: household.name, ok: t('save') }))?.trim();
    if (!name || name === household.name) return;
    attempt(async () => {
      await db.updateHousehold({ name });
      toast(t('renamed'));
      onChange();
    });
  };

  const waiting = people.filter((p) => p.role === 'pending').length;

  return html`
    <a class="back" href="#/settings">${isAr ? '→' : '←'} ${t('nav_settings')}</a>
    <div class="page-head">
      <h1>${t('team_title')}</h1>
      <button class="btn" onClick=${rename}>${t('rename_household')}</button>
    </div>
    <div class="card pad form" style="margin-bottom:16px">
      <h2>${t('invite_title', { name: household.name })}</h2>
      <p class="muted small">${t('invite_hint')}</p>
      <dl class="facts">
        <div><dt>${t('invite_link')}</dt><dd dir="ltr">${link}</dd></div>
        <div><dt>${t('join_code')}</dt><dd class="join-code" dir="ltr">${code}</dd></div>
      </dl>
      <div class="actions">
        <button class="btn primary" onClick=${copyLink}>${t('copy_link')}</button>
        <button class="btn" onClick=${newCode}>${t('new_code')}</button>
      </div>
    </div>
    ${waiting > 0 && html`<p style="margin-bottom:10px"><strong>${t('waiting_count', { count: waiting })}</strong></p>`}
    <div class="card list">
      ${people.map(
        (p) => html`
          <div class="row wrap" key=${p.id}>
            <div class="main">
              <div class="title">${who(p)} ${p.id === me.id && html`<span class="badge">${t('you')}</span>`}</div>
              <div class="sub" dir="ltr">${p.email}</div>
            </div>
            <div class="actions">
              <select style="width:auto;max-width:100%" value=${p.role} disabled=${p.id === me.id}
                onChange=${(e) => change(p, e.target.value)} aria-label=${who(p)}>
                ${ROLES.map((k) => html`<option value=${k} key=${k}>${roleLabel(k)}</option>`)}
              </select>
              ${p.id !== me.id && html`<button class="btn small" onClick=${() => remove(p)}>${t('remove')}</button>`}
            </div>
          </div>
        `,
      )}
    </div>
  `;
}

export function Settings({ me, household, onChange }) {
  const [currency, setCurrency] = useState(household.currency);
  const [voice, setVoice] = useState(voiceLang());
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function saveHousehold(e) {
    e.preventDefault();
    try {
      await db.updateHousehold({ currency });
      toast(t('household_saved'));
      onChange();
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function backup() {
    setBusy(true);
    try {
      const [categories, expenses] = await Promise.all([db.listCategories(), db.listExpenses()]);
      download(`home-finance-backup-${today()}.json`, buildBackup(household, categories, expenses), 'application/json');
    } catch (err) {
      toast(err.message, true);
    }
    setBusy(false);
  }

  async function restore(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let parsed;
    try {
      parsed = readBackup(await file.text());
    } catch (err) {
      return toast(err.message === 'empty' ? t('backup_empty') : t('backup_bad'), true);
    }
    const okay = await ask(
      t('restore_confirm', { expenses: parsed.expenses.length, categories: parsed.categories.length }),
      { ok: t('restore_button'), danger: true },
    );
    if (!okay) return;
    setBusy(true);
    try {
      const count = await db.importBackup(parsed);
      if (parsed.currency && parsed.currency !== household.currency) {
        await db.updateHousehold({ currency: parsed.currency });
        onChange();
      }
      changed();
      toast(t('restored', { count }));
    } catch (err) {
      toast(err.message, true);
    }
    setBusy(false);
  }

  return html`
    <div class="page-head"><h1>${t('settings_title')}</h1></div>
    <div class="narrow stack">
      <section class="card pad form">
        <h2>${t('language')}</h2>
        <div class="seg">
          <button class=${lang === 'ar' ? 'on' : ''} onClick=${() => setLang('ar')}>العربية</button>
          <button class=${lang === 'en' ? 'on' : ''} onClick=${() => setLang('en')}>English</button>
        </div>
        <label>
          <span>${t('voice_language')}</span>
          <select value=${voice} onChange=${(e) => { setVoice(e.target.value); setVoiceLang(e.target.value); }}>
            ${VOICE_LANGS.map(([k, ar, en]) => html`<option value=${k} key=${k}>${isAr ? ar : en}</option>`)}
          </select>
        </label>
        <p class="muted small">${t('voice_privacy')}</p>
      </section>

      <section class="card pad form">
        <h2>${t('household_settings')}: ${household.name}</h2>
        ${me.isAdmin &&
        html`<form class="inline-form" onSubmit=${saveHousehold}>
          <label>
            <span>${t('currency')}</span>
            <input required maxlength="12" value=${currency} onInput=${(e) => setCurrency(e.target.value)} />
          </label>
          <button class="btn" disabled=${currency.trim() === household.currency}>${t('save')}</button>
        </form>`}
        <div class="actions">
          ${me.isAdmin && html`<a class="btn" href="#/team">${t('manage_team')}</a>`}
          <a class="btn" href="#/households">${t('switch_household')}</a>
        </div>
      </section>

      <section class="card pad form">
        <h2>${t('backup_title')}</h2>
        <p class="muted small">${demoMode ? t('backup_hint_demo') : t('backup_hint')}</p>
        <div class="actions">
          <button class="btn primary" disabled=${busy} onClick=${backup}>${t('download_backup')}</button>
          ${me.isAdmin &&
          html`<button class="btn" disabled=${busy} onClick=${() => fileRef.current.click()}>${t('restore_backup')}</button>`}
          <input ref=${fileRef} type="file" accept=".json,application/json,text/plain" hidden onChange=${restore} />
        </div>
        ${!me.isAdmin && html`<p class="muted small">${t('restore_admin_only')}</p>`}
      </section>

      <section class="card pad form">
        <h2>${t('account')}</h2>
        <p><strong>${me.full_name || me.email}</strong> <span class="muted small" dir="ltr">${me.email}</span></p>
        <p class="muted small">${roleLabel(me.role)}</p>
        ${!demoMode && html`<div class="actions"><button class="btn" onClick=${() => db.signOut()}>${t('sign_out')}</button></div>`}
      </section>

      <section class="card pad form">
        <h2>${t('privacy')}</h2>
        <p class="muted small">${t('privacy_text')}</p>
      </section>
    </div>
  `;
}
