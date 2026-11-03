/** Standalone, dependency-free web version of the card (one HTML file). */

import { layoutCard } from '../render/card.js';
import { webIconSet } from '../render/icons.js';
import { toHtml, escapeHtml } from '../render/format.js';
import { createTranslator, languageName } from '../i18n/index.js';
import { localize } from '../text.js';

export function renderWebPage(config, { command }) {
  const { theme } = config;
  const langs = config.language.available;
  const fallback = langs.includes('en') ? 'en' : langs[0];
  const data = Object.fromEntries(
    langs.map((lang) => {
      const t = createTranslator(lang, config.strings);
      return [lang, { card: toHtml(layoutCard(config, lang, { iconSet: webIconSet(config.icons) })), save: t('action.save'), vcf: `contact.${lang}.vcf` }];
    }),
  );
  const description = [config.name, localize(config.title, fallback), localize(config.tagline, fallback)].filter(Boolean).join(' — ');
  // JSON embedded in <script> must not be able to close the tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="${fallback}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(config.name)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(config.name)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta name="color-scheme" content="dark">
<style>
:root{--bg:#0e0e0e;--window:#161616;--line:#262626;--text:${theme.text === 'default' ? '#eeeeee' : theme.text};--muted:${theme.muted};--faint:${theme.faint};--accent:${theme.accent}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text)}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;
  font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;font-size:min(15px,calc((100vw - 72px) / 32))}
.window{width:max-content;max-width:100%;background:var(--window);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;border-bottom:1px solid var(--line);color:var(--faint);font-size:.85em}
.lang{display:flex;gap:4px}
.lang button{all:unset;cursor:pointer;padding:2px 8px;border-radius:4px;color:var(--faint)}
.lang button[aria-pressed="true"]{color:var(--accent)}
.lang button:focus-visible,.btn:focus-visible,a:focus-visible{outline:1px solid var(--accent);outline-offset:2px}
pre{margin:20px;padding:1.6em 2.4em;border:1px solid var(--line);border-radius:6px;font:inherit;line-height:1.45;white-space:pre;overflow-x:auto}
a{color:inherit;text-decoration:none}
a:hover span{text-decoration:underline;text-underline-offset:3px}
.name{color:var(--text);font-weight:700}.text{color:var(--text)}.muted{color:var(--muted)}.faint{color:var(--faint)}.accent{color:var(--accent)}
.foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:0 20px 20px}
.cmd{display:flex;align-items:center;gap:10px}
.cmd code::before{content:"$ ";color:var(--faint)}
.btn{all:unset;cursor:pointer;color:var(--faint);font-size:.85em;padding:2px 8px;border:1px solid var(--line);border-radius:4px}
.btn:hover{color:var(--accent)}
@media (max-width:600px){body{padding:16px}pre{margin:12px;padding:1.2em 1.4em}.foot{padding:0 12px 14px}}
</style>
</head>
<body>
<main class="window">
  <div class="bar"><span>~ ${escapeHtml(command)}</span>${
    langs.length > 1
      ? `<span class="lang" role="group" aria-label="Language">${langs.map((l) => `<button type="button" data-lang="${l}" title="${escapeHtml(languageName(l, config.strings))}">${l.toUpperCase()}</button>`).join('')}</span>`
      : ''
  }</div>
  <pre id="card" aria-label="${escapeHtml(config.name)}">${data[fallback].card}</pre>
  <div class="foot">
    <span class="cmd"><code>${escapeHtml(command)}</code><button class="btn" type="button" id="copy">Copy</button></span>
    <a class="btn" id="vcf" href="${data[fallback].vcf}" download>${escapeHtml(data[fallback].save)}</a>
  </div>
</main>
<script>
(() => {
  const data = ${json};
  const langs = Object.keys(data);
  const $ = (id) => document.getElementById(id);
  const has = (lang) => Object.prototype.hasOwnProperty.call(data, lang);
  const set = (lang) => {
    if (!has(lang)) lang = langs.includes('${fallback}') ? '${fallback}' : langs[0];
    document.documentElement.lang = lang;
    $('card').innerHTML = data[lang].card;
    $('vcf').textContent = data[lang].save;
    $('vcf').href = data[lang].vcf;
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  };
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    set(b.dataset.lang);
    const url = new URL(location.href); url.searchParams.set('lang', b.dataset.lang); history.replaceState(null, '', url);
  }));
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('copy').previousElementSibling.textContent); $('copy').textContent = '✓'; setTimeout(() => { $('copy').textContent = 'Copy'; }, 1500); } catch {}
  });
  const param = new URLSearchParams(location.search).get('lang');
  const browser = (navigator.languages || [navigator.language]).map((l) => String(l).slice(0, 2).toLowerCase()).find(has);
  set(param || browser);
})();
</script>
</body>
</html>
`;
}
