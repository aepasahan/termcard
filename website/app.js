// termcard.dev — live demo and config builder.
// The builder uses Termcard's own validation and rendering, so the preview matches the terminal.
// Only a fixed, same-origin path may replace the CDN build (local development), never a URL from the query string.
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('local');
const SOURCE = LOCAL ? '/packages/termcard/src/browser.js' : 'https://cdn.jsdelivr.net/npm/termcard@0.6/src/browser.js';
const tc = await import(SOURCE);

const $ = (selector, root = document) => root.querySelector(selector);
const form = $('#form');
const STORAGE_KEY = 'termcard-builder-draft';

// ---------- rendering a config into a terminal window ----------
function paint(target, tabs, config, state) {
  const lang = config.language.available.includes(state.lang) ? state.lang : config.language.available[0];
  state.lang = lang;
  const theme = config.theme;
  const vars = {
    '--card-text': theme.text === 'default' ? '#ececec' : theme.text,
    '--card-muted': theme.muted, '--card-faint': theme.faint, '--card-accent': theme.accent,
  };
  for (const [k, v] of Object.entries(vars)) target.closest('.term').style.setProperty(k, v);

  const iconSet = tc.webIconSet(config.icons);
  const viewConfig = { ...config, icons: iconSet };
  const card = document.createElement('div');
  if (config.card.enabled) {
    card.className = `card b-${config.card.border}`;
    card.innerHTML = tc.toHtml(tc.layoutCard(config, lang, { iconSet })); // escaped by Termcard
  } else {
    card.className = 'card header';
    card.innerHTML = tc.toHtml([[], ...tc.layoutHeader(config, lang), []]);
  }
  target.replaceChildren(card);

  if (config.menu.enabled) {
    const t = tc.createTranslator(lang, config.strings);
    const entries = tc.buildMenu(viewConfig, lang, t);
    const iconWidth = Math.max(0, ...entries.map((e) => [...(e.icon || '')].length));
    const list = document.createElement('ul');
    list.className = 'menu';
    entries.forEach((entry, i) => {
      const li = document.createElement('li');
      if (i === 0) li.className = 'on';
      if (iconWidth) {
        const ic = document.createElement('span');
        ic.className = 'ic';
        ic.textContent = (entry.icon || '').padEnd(iconWidth, ' ') + ' ';
        li.append(ic);
      }
      li.append(entry.label);
      list.append(li);
    });
    const hint = document.createElement('div');
    hint.className = 'menu-hint';
    hint.textContent = `${entries[0]?.hint ?? ''}\n↑↓ ${t('keys.navigate')}  ·  enter ${t('keys.select')}  ·  q ${t('keys.quit')}`;
    target.append(list, hint);
  }

  tabs.replaceChildren(...(config.language.available.length > 1 ? config.language.available.map((code) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = code.toUpperCase();
    b.title = tc.languageName(code, config.strings);
    b.setAttribute('aria-pressed', String(code === lang));
    b.addEventListener('click', () => { state.lang = code; paint(target, tabs, config, state); });
    return b;
  }) : []));
}

// ---------- demo: the author's own card ----------
const demo = tc.normalizeConfig({
  name: 'Ahmet Erkan Paşahan',
  tagline: '@creetivelab',
  email: 'ae.pasahan@creetivelab.com',
  website: 'https://aepasahan.com',
  location: { en: 'Istanbul · Türkiye', tr: 'İstanbul · Türkiye' },
  links: ['https://www.linkedin.com/in/aepasahan', 'https://github.com/aepasahan', 'https://x.com/aepasahan_dev'],
  language: { available: ['en', 'tr'] },
  theme: 'frost',
  icons: 'symbols',
});
const demoState = { lang: (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en' };
paint($('#demo'), $('#demo-tabs'), demo, demoState);

// ---------- builder form ----------
for (const [id, description] of Object.entries(tc.THEME_DESCRIPTIONS)) {
  const label = document.createElement('label');
  label.className = 'swatch';
  label.innerHTML = '<input type="radio" name="theme"><span><i></i><b></b></span>';
  const input = $('input', label);
  input.value = id;
  input.checked = id === tc.DEFAULT_THEME;
  $('i', label).style.background = tc.themes[id].accent;
  $('b', label).textContent = id;
  label.title = description;
  $('#swatches').append(label);
}
for (const code of tc.BUILT_IN_LANGUAGES) {
  const label = document.createElement('label');
  label.innerHTML = '<input type="checkbox" name="lang">';
  $('input', label).value = code;
  $('input', label).checked = code === 'en';
  label.append(` ${tc.languageName(code)}`);
  $('#langs').append(label);
}

const value = (name) => form.elements[name].value.trim();
const withProtocol = (url) => (url && !/^https?:\/\//i.test(url) ? `https://${url}` : url);

/** Form → raw config (only filled-in fields, in the order of the configuration reference). */
function readForm() {
  const languages = [...form.querySelectorAll('input[name=lang]:checked')].map((i) => i.value);
  const config = { name: value('name') };
  for (const key of ['title', 'tagline', 'description', 'organization', 'email', 'phone']) if (value(key)) config[key] = value(key);
  if (value('website')) config.website = withProtocol(value('website'));
  if (value('location')) config.location = value('location');
  const links = value('links').split('\n').map((l) => withProtocol(l.trim())).filter(Boolean);
  if (links.length) config.links = links;
  config.language = { default: value('defaultLang'), available: languages.length ? languages : ['en'] };
  if (value('template') !== 'classic') config.template = value('template');
  const theme = form.querySelector('input[name=theme]:checked')?.value;
  if (theme && theme !== tc.DEFAULT_THEME) config.theme = theme;
  if (value('icons') !== 'none') config.icons = value('icons');
  if (!form.elements.showCard.checked) config.card = false;
  else if (value('border')) config.card = { border: value('border') };
  if (!form.elements.showMenu.checked) config.menu = false;
  return config;
}

/** Raw config → form (for "Load an existing card.config.json"). Unknown options are kept as-is. */
let extra = {};
function fillForm(raw) {
  const text = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? (v.en ?? Object.values(v)[0] ?? '') : '');
  for (const key of ['name', 'title', 'tagline', 'description', 'organization', 'email', 'phone', 'website', 'location']) {
    form.elements[key].value = text(raw[key]);
  }
  form.elements.links.value = (raw.links ?? []).map((l) => (typeof l === 'string' ? l : l.url)).join('\n');
  form.elements.template.value = raw.template ?? 'classic';
  form.elements.icons.value = raw.icons ?? 'none';
  const themeId = typeof raw.theme === 'string' ? raw.theme : raw.theme?.preset ?? tc.DEFAULT_THEME;
  for (const input of form.querySelectorAll('input[name=theme]')) input.checked = input.value === themeId;
  form.elements.showCard.checked = raw.card !== false;
  form.elements.showMenu.checked = raw.menu !== false;
  form.elements.border.value = (raw.card && raw.card.border) || '';
  const langs = typeof raw.language === 'string' ? [raw.language] : raw.language?.available ?? ['en'];
  for (const input of form.querySelectorAll('input[name=lang]')) input.checked = langs.includes(input.value);
  // Options the form does not edit (localized texts, strings, menu items, card fields…) are preserved.
  extra = Object.fromEntries(Object.entries(raw).filter(([k, v]) =>
    ['strings', '$schema'].includes(k) || (k === 'menu' && typeof v === 'object') || (k === 'card' && typeof v === 'object')
    || (['title', 'tagline', 'description', 'location'].includes(k) && v && typeof v === 'object')));
  syncDefaultLang(typeof raw.language === 'object' ? raw.language.default : raw.language);
  update();
}

function syncDefaultLang(selected = value('defaultLang')) {
  const select = form.elements.defaultLang;
  const langs = [...form.querySelectorAll('input[name=lang]:checked')].map((i) => i.value);
  select.replaceChildren(new Option("Automatic — visitor's system language", 'auto'), ...langs.map((l) => new Option(tc.languageName(l), l)));
  select.value = langs.includes(selected) ? selected : 'auto';
}

const previewState = { lang: 'en' };
let current = null;

function merge(config) {
  const merged = { ...config, ...extra };
  if (extra.card && config.card !== false) merged.card = { ...extra.card, ...(config.card || {}) };
  if (extra.menu && config.menu === false) merged.menu = false;
  return merged;
}

function update() {
  const count = value('description').length;
  $('#desc-count').textContent = `${count} / ${tc.DESCRIPTION_LIMIT}`;
  $('#desc-count').classList.toggle('over', count > tc.DESCRIPTION_LIMIT);

  const raw = merge(readForm());
  const pkg = value('packageName') || tc.slugify(raw.name || '') || 'your-name';
  $('#preview-title').textContent = `~ npx ${pkg}`;
  $('#share-cmd').textContent = `npx ${pkg}`;
  $('#create-cmd').textContent = `npm create termcard@latest -- --config card.config.json --name ${pkg}`;

  const errors = $('#errors');
  try {
    const config = tc.normalizeConfig({ ...raw, name: raw.name || 'Your Name' });
    if (!raw.name) throw new tc.ConfigError(['name: is required']);
    current = raw;
    errors.hidden = true;
    paint($('#preview'), $('#preview-tabs'), config, previewState);
  } catch (error) {
    if (!(error instanceof tc.ConfigError)) throw error;
    current = null;
    errors.replaceChildren(...error.problems.map((p) => Object.assign(document.createElement('li'), { textContent: p })));
    errors.hidden = false;
    try {
      paint($('#preview'), $('#preview-tabs'), tc.normalizeConfig({ name: raw.name || 'Your Name' }), previewState);
    } catch { /* name itself invalid: keep the last preview */ }
  }
  $('#json').textContent = JSON.stringify(raw, null, 2);
  $('#download').disabled = !current;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ raw, packageName: value('packageName') })); } catch { /* storage unavailable */ }
}

form.addEventListener('input', (event) => {
  if (event.target.name === 'lang') syncDefaultLang();
  update();
});
form.addEventListener('submit', (event) => event.preventDefault());

$('#download').addEventListener('click', () => {
  if (!current) return;
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(current, null, 2)}\n`], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'card.config.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('#import').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file || file.size > 64 * 1024) return;
  try {
    fillForm(JSON.parse(await file.text()));
  } catch {
    $('#errors').replaceChildren(Object.assign(document.createElement('li'), { textContent: 'That file is not valid JSON.' }));
    $('#errors').hidden = false;
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy]');
  if (!button) return;
  try {
    await navigator.clipboard.writeText($(button.dataset.copy).textContent);
    const label = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = label; }, 1400);
  } catch { /* clipboard unavailable */ }
});

// Restore a draft from this browser, if any.
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved?.raw?.name) {
    fillForm(saved.raw);
    form.elements.packageName.value = saved.packageName || '';
  }
} catch { /* ignore */ }
syncDefaultLang();
update();
