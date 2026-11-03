/**
 * Snippets that make `curl yourdomain.com` print the card. They fetch the
 * prebuilt text files from the published npm package via jsDelivr, so the
 * site always shows the latest released card without redeploying.
 */

const shared = (pkg, langs) => `const CARD_BASE = 'https://cdn.jsdelivr.net/npm/${pkg}@latest/dist';
const LANGS = ${JSON.stringify(langs)};
const TERMINAL = /^(curl|wget|httpie|xh|fetch|libfetch)\\b/i;

function cardFile(url, headers) {
  const ua = headers.get('user-agent') || '';
  if (!TERMINAL.test(ua)) return null;
  const path = url.pathname.replace(/\\/+$/, '') || '/';
  const fromPath = LANGS.find((l) => path === '/' + l);
  if (path !== '/' && !fromPath) return null;
  const accepted = (headers.get('accept-language') || '').split(',').map((p) => p.trim().slice(0, 2).toLowerCase());
  const lang = fromPath || LANGS.find((l) => url.searchParams.get('lang') === l) || accepted.find((l) => LANGS.includes(l)) || LANGS[0];
  const plain = /^wget/i.test(ua) || url.searchParams.has('plain');
  return CARD_BASE + '/card.' + lang + (plain ? '.txt' : '.ansi');
}

const TEXT_HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'public, max-age=3600',
  vary: 'user-agent, accept-language',
};`;

export function integrations(pkg, langs) {
  const ordered = langs.includes('en') ? ['en', ...langs.filter((l) => l !== 'en')] : langs;
  const routes = JSON.stringify(['/', ...ordered.map((l) => `/${l}`)]);
  return {
    'cloudflare-worker.js': `// Cloudflare Worker: add a route for your domain (e.g. example.com/*).
// Terminal clients get the card; everyone else gets your site unchanged.
${shared(pkg, ordered)}

export default {
  async fetch(request) {
    const file = cardFile(new URL(request.url), request.headers);
    if (!file) return fetch(request);
    const res = await fetch(file, { cf: { cacheTtl: 3600 } });
    return res.ok ? new Response(res.body, { headers: TEXT_HEADERS }) : fetch(request);
  },
};
`,
    'nextjs-middleware.js': `// Next.js / Vercel: save as middleware.js in your project root.
import { NextResponse } from 'next/server';
${shared(pkg, ordered)}

export const config = { matcher: ${routes} };

export async function middleware(request) {
  const file = cardFile(request.nextUrl, request.headers);
  if (!file) return NextResponse.next();
  const res = await fetch(file, { next: { revalidate: 3600 } });
  return res.ok ? new NextResponse(await res.text(), { headers: TEXT_HEADERS }) : NextResponse.next();
}
`,
    'netlify-edge.js': `// Netlify: save as netlify/edge-functions/terminal-card.js
${shared(pkg, ordered)}

export default async (request, context) => {
  const file = cardFile(new URL(request.url), request.headers);
  if (!file) return context.next();
  const res = await fetch(file);
  return res.ok ? new Response(res.body, { headers: TEXT_HEADERS }) : context.next();
};

export const config = { path: ${routes} };
`,
  };
}
