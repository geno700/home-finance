// App shell: login, households, navigation and routing.
import { html, render, useState, useEffect } from './lib.js';
import { db, demoMode } from './data.js';
import { t, lang, setLang } from './i18n.js';
import { toast, lastHousehold, rememberHousehold } from './ui.js';
import { Dashboard } from './views-home.js';
import { ExpenseForm, History } from './views-expenses.js';
import { Categories } from './views-categories.js';
import { HouseholdManager, Households, Team, Settings } from './views-household.js';

// An invite link looks like .../?join=CODE. Keep the code until the person has signed in.
const INVITE_KEY = 'home-finance-invite';
{
  const url = new URL(location.href);
  const code = url.searchParams.get('join');
  if (code) {
    try {
      sessionStorage.setItem(INVITE_KEY, code);
    } catch {
      // Storage blocked: the person can still type the code in.
    }
    url.searchParams.delete('join');
    history.replaceState(null, '', url);
  }
}
function takeInvite(clear) {
  try {
    const code = sessionStorage.getItem(INVITE_KEY);
    if (clear) sessionStorage.removeItem(INVITE_KEY);
    return code;
  } catch {
    return null;
  }
}

function useRoute() {
  // Sign-in links put their own data after the #, which is not a page of this app.
  const read = () => (location.hash.startsWith('#/') ? location.hash.slice(1) : '/');
  const [route, setRoute] = useState(read());
  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      scrollTo(0, 0);
    };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

function Brand({ name = t('app_name') }) {
  return html`<a class="brand" href="#/"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">${name}</span></a>`;
}

function LangSwitch() {
  const other = lang === 'ar' ? 'en' : 'ar';
  return html`<button class="link lang-switch" onClick=${() => setLang(other)}>${other === 'ar' ? 'العربية' : 'English'}</button>`;
}

function Login() {
  const [mode, setMode] = useState('in'); // in | up | reset
  const [f, setF] = useState({ email: '', password: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const to = (m) => {
    setMode(m);
    setError('');
    setNotice('');
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'in') await db.signIn(f.email.trim(), f.password);
      else if (mode === 'reset') {
        await db.sendPasswordReset(f.email.trim());
        setNotice(t('reset_sent'));
      } else {
        const res = await db.signUp(f.email.trim(), f.password, f.name.trim());
        if (res.needsConfirm) setNotice(t('confirm_email'));
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  const title = { in: t('sign_in'), up: t('create_account'), reset: t('reset_password') }[mode];

  return html`
    <div class="auth">
      <${Brand} />
      <form class="card pad form" onSubmit=${submit}>
        <h1>${title}</h1>
        ${takeInvite() && html`<p class="small">${t('invited')}</p>`}
        ${notice && html`<p class="note">${notice}</p>`}
        ${error && html`<p class="error">${error}</p>`}
        ${mode === 'up' &&
        html`<label><span>${t('your_name')}</span><input required value=${f.name} onInput=${set('name')} autocomplete="name" /></label>`}
        <label>
          <span>${t('email')}</span>
          <input type="email" dir="ltr" required value=${f.email} onInput=${set('email')} autocomplete="email" />
        </label>
        ${mode !== 'reset' &&
        html`<label>
          <span>${t('password')}</span>
          <input type="password" dir="ltr" required minlength=${mode === 'in' ? 1 : 8} value=${f.password} onInput=${set('password')}
            autocomplete=${mode === 'in' ? 'current-password' : 'new-password'} />
        </label>`}
        <button class="btn primary" disabled=${busy}>${mode === 'reset' ? t('send_reset') : title}</button>
      </form>
      <p class="switch">
        ${mode === 'in' ? t('new_here') : mode === 'up' ? t('have_account') : ''}
        <button type="button" onClick=${() => to(mode === 'in' ? 'up' : 'in')}>
          ${mode === 'in' ? t('create_account') : mode === 'up' ? t('sign_in') : t('back_to_sign_in')}
        </button>
      </p>
      ${mode === 'in' && html`<p class="switch"><button type="button" onClick=${() => to('reset')}>${t('forgot')}</button></p>`}
      <p class="switch"><${LangSwitch} /></p>
    </div>
  `;
}

function SetPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await db.setPassword(password);
      toast(t('password_changed'));
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return html`
    <div class="auth">
      <${Brand} />
      <form class="card pad form" onSubmit=${submit}>
        <h1>${t('new_password_title')}</h1>
        ${error && html`<p class="error">${error}</p>`}
        <label>
          <span>${t('new_password')}</span>
          <input type="password" dir="ltr" required minlength="8" value=${password} onInput=${(e) => setPassword(e.target.value)}
            autocomplete="new-password" />
        </label>
        <button class="btn primary" disabled=${busy}>${t('save_password')}</button>
      </form>
    </div>
  `;
}

// Shown when the person has no household to open: none yet, or still waiting for approval.
function Welcome({ auth, onChange }) {
  const waiting = auth.current?.role === 'pending';
  return html`
    <div class="auth wide">
      <${Brand} />
      <div class="card pad form" style="margin-bottom:16px">
        <h1>${waiting ? t('waiting') : t('welcome')}</h1>
        <p class="muted">${waiting ? t('waiting_text', { name: auth.current.name }) : t('welcome_text')}</p>
        <div class="actions">
          ${waiting && html`<button class="btn" onClick=${onChange}>${t('check_again')}</button>`}
          ${!demoMode && html`<button class="btn" onClick=${() => db.signOut()}>${t('sign_out')} (${auth.profile?.email})</button>`}
        </div>
      </div>
      <${HouseholdManager} households=${auth.households} current=${auth.current} onChange=${onChange} />
      <p class="switch"><${LangSwitch} /></p>
    </div>
  `;
}

const Icon = ({ d }) => html`
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${d} /></svg>
`;
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  history: 'M4 6h16M4 12h16M4 18h10',
  add: 'M12 5v14M5 12h14',
  categories: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};

function App() {
  const route = useRoute();
  const [auth, setAuth] = useState({ loading: true });

  async function refresh() {
    try {
      const user = await db.getUser();
      if (!user) return setAuth({ user: null });
      const profile = await db.getProfile();

      const invite = takeInvite(true);
      if (invite && !db.inRecovery()) {
        try {
          const before = await db.listHouseholds();
          const h = await db.joinHousehold(invite);
          rememberHousehold(h.id);
          const had = before.find((x) => x.id === h.id);
          toast(had && had.role !== 'pending' ? t('already_in', { name: h.name }) : t('request_sent', { name: h.name }));
        } catch (err) {
          toast(err.message, true);
        }
      }

      const households = await db.listHouseholds();
      const last = lastHousehold();
      const current =
        households.find((h) => h.id === last) ?? households.find((h) => h.role !== 'pending') ?? households[0] ?? null;
      if (current) db.useHousehold(current.id);
      setAuth({ user, profile, households, current });
    } catch (err) {
      setAuth({ error: err.message });
    }
  }
  useEffect(() => {
    refresh();
    return db.onAuthChange(refresh);
  }, []);

  if (auth.loading) return html`<p class="boot">${t('loading')}</p>`;
  if (auth.error) return html`<p class="state">${t('could_not_connect', { msg: auth.error })}</p>`;
  if (!auth.user) return html`<${Login} />`;
  if (db.inRecovery()) return html`<${SetPassword} onDone=${refresh} />`;

  const role = auth.current?.role ?? 'pending';
  if (role === 'pending') return html`<${Welcome} auth=${auth} onChange=${refresh} />`;

  const me = { ...auth.profile, role, canEdit: role === 'member' || role === 'admin', isAdmin: role === 'admin' };
  const household = auth.current;
  const [path, search = ''] = route.split('?');
  const query = new URLSearchParams(search);
  const parts = path.split('/').filter(Boolean);
  const section = parts[0] ?? '';

  let view;
  if (!section) view = html`<${Dashboard} me=${me} household=${household} />`;
  else if (section === 'add') view = html`<${ExpenseForm} me=${me} household=${household} key=${'add' + route} />`;
  else if (section === 'expenses' && parts[1])
    view = html`<${ExpenseForm} me=${me} household=${household} id=${parts[1]} key=${parts[1]} />`;
  else if (section === 'history') view = html`<${History} household=${household} query=${query} />`;
  else if (section === 'categories') view = html`<${Categories} me=${me} household=${household} />`;
  else if (section === 'settings') view = html`<${Settings} me=${me} household=${household} onChange=${refresh} />`;
  else if (section === 'team' && me.isAdmin) view = html`<${Team} me=${me} household=${household} onChange=${refresh} />`;
  else if (section === 'households')
    view = html`<${Households} households=${auth.households} current=${household} onChange=${refresh} />`;
  else view = html`<p class="state">${t('not_found')} <a href="#/"><u>${t('go_home')}</u></a></p>`;

  const active = { expenses: 'history', team: 'settings', households: 'settings' }[section] ?? section;
  const link = (key, href, label) =>
    html`<a href=${href} class=${(active === key ? 'active' : '') + (key === 'add' ? ' add' : '')}
      aria-current=${active === key ? 'page' : undefined}>
      <${Icon} d=${ICONS[key || 'home']} /><span>${label}</span>
    </a>`;

  return html`
    ${demoMode &&
    html`<div class="banner">
      <span>${t('demo_banner')}</span>
      <button onClick=${() => { db.resetDemo(); toast(t('demo_restored')); location.reload(); }}>${t('demo_reset')}</button>
    </div>`}
    <header class="topbar">
      <${Brand} name=${household.name} />
      <nav class="nav" aria-label=${t('app_name')}>
        ${link('', '#/', t('nav_home'))}
        ${link('history', '#/history', t('nav_history'))}
        ${me.canEdit && link('add', '#/add', t('nav_add'))}
        ${link('categories', '#/categories', t('nav_categories'))}
        ${link('settings', '#/settings', t('nav_settings'))}
      </nav>
      <div class="user">
        <span class="who">${me.full_name || me.email}</span>
      </div>
    </header>
    <main>${view}</main>
  `;
}

render(html`<${App} />`, document.getElementById('app'));
