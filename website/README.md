# termcard.dev

The Termcard website: an introduction, a live demo, how to use Termcard in Claude, and a
browser-based builder for `card.config.json`. Plain HTML and one JavaScript module — no build
step, no dependencies. The builder imports Termcard's browser entry point from jsDelivr
(`termcard@0.6/src/browser.js`), so validation and previews match the real card.

Deployed on Vercel with **Root Directory** `website` and no build command.
`vercel.json` sets security headers (a strict Content Security Policy among them) and skips
deployments when nothing in this folder changed.

## Local preview

From the repository root, serve `website/` as the site root and `packages/` next to it, then open
`http://localhost:<port>/?local` — on localhost, `?local` loads Termcard from
`packages/termcard/src` instead of the CDN.

When Termcard's config format changes in a new minor version, update the version in
`SOURCE` in `app.js`.
