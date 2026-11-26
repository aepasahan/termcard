/** Standalone, dependency-free web version of the card (one HTML file). */

import { CREDIT_TEXT, CREDIT_URL } from '../render/credit.js';
import { layoutCard } from '../render/card.js';
import { webIconSet } from '../render/icons.js';
import { toHtml, escapeHtml } from '../render/format.js';
import { createTranslator, languageName, textDirection } from '../i18n/index.js';
import { localize } from '../text.js';

/** The card's sections as HTML lists. Every value is escaped; URLs were validated as http(s). */
function sectionsHtml(config, lang) {
  return config.sections
    .map((section) => {
      const items = section.items
        .map((item) => {
          const label = escapeHtml(localize(item.label, lang));
          const text = item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><span>${label}</span></a>` : label;
          const description = localize(item.description, lang);
          return `<li>${text}${description ? `<span class="muted"> — ${escapeHtml(description)}</span>` : ''}</li>`;
        })
        .join('');
      return `<section><h2 class="accent">${escapeHtml(localize(section.title, lang))}</h2><ul>${items}</ul></section>`;
    })
    .join('');
}

export function renderWebPage(config, { command }) {
  const { theme } = config;
  const langs = config.language.available;
  const fallback = langs.includes('en') ? 'en' : langs[0];
  const data = Object.fromEntries(
    langs.map((lang) => {
      const t = createTranslator(lang, config.strings);
      return [lang, { card: toHtml(layoutCard(config, lang, { iconSet: webIconSet(config.icons) })), sections: sectionsHtml(config, lang), save: t('action.save'), vcf: `contact.${lang}.vcf`, dir: textDirection(lang, config.strings) }];
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
:root{--bg:#0e0e0e;--window:#161616;--line:#262626;--text:${theme.text === 'default' ? '#eeeeee' : theme.text};--muted:${theme.muted};--faint:${theme.faint};--accent:${theme.accent};--card-bg:${theme.background === 'default' ? 'transparent' : Array.isArray(theme.background) ? `linear-gradient(90deg,${theme.background.join(',')})` : theme.background}}
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
pre{unicode-bidi:plaintext;background:var(--card-bg);margin:20px;padding:1.6em 2.4em;border:1px solid var(--line);border-radius:6px;font:inherit;line-height:1.45;white-space:pre;overflow-x:auto}
a{color:inherit;text-decoration:none}
a:hover span{text-decoration:underline;text-underline-offset:3px}
.name{color:var(--text);font-weight:700}.text{color:var(--text)}.muted{color:var(--muted)}.faint{color:var(--faint)}.accent{color:var(--accent)}
.art{display:inline-block;transform:scaleY(1.1);-webkit-text-stroke:.05em currentColor}
.sections{padding:0 20px;max-width:64ch}.sections:empty{display:none}.sections section{margin:0 0 18px}.sections h2{font-size:1em;margin:0 0 6px}.sections ul{margin:0;padding-left:1.2em}.sections li{margin:2px 0}
.credit{margin:0;padding:0 20px 16px;font-size:12px}.credit a{color:var(--faint);text-decoration:none}.credit a:hover{color:var(--accent)}
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
  <div id="sections" class="sections">${data[fallback].sections}</div>
  <div class="foot">
    <span class="cmd"><code>${escapeHtml(command)}</code><button class="btn" type="button" id="copy">Copy</button></span>
    <a class="btn" id="vcf" href="${data[fallback].vcf}" download>${escapeHtml(data[fallback].save)}</a>
  </div>${config.credit ? `
  <p class="credit"><a href="${CREDIT_URL}">${escapeHtml(CREDIT_TEXT)}</a></p>` : ''}
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
    document.documentElement.dir = data[lang].dir;
    $('card').innerHTML = data[lang].card;
    $('sections').innerHTML = data[lang].sections;
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
