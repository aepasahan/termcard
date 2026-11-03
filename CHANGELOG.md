# Changelog

All notable changes are documented here. This project follows
[Semantic Versioning](https://semver.org); until 1.0.0, minor versions may contain
breaking changes to the config format.

## 0.2.0 — Unreleased

### termcard
- **Themes:** eight seasonal themes — `thaw`, `bloom`, `blossom`, `solstice` (default),
  `ember`, `harvest`, `frost`, `midwinter` — replacing the previous presets. Text now
  uses the terminal's own color, so cards read well on light backgrounds too.
- **Icons:** `icons` option with `symbols`, `emoji` and `nerd` (Nerd Font) sets, shown on
  card rows, the location and menu entries; per-link `icon`.
- **Description:** `description` (up to 280 characters, localizable) replaces `about`
  and wraps to the card width.
- **Menu-only cards:** `"card": false` shows just a header and the menu.
- `termcard/browser` entry point without Node.js built-ins, for web tools.

### Website
- `site/index.html`: project page with a live demo and a browser-based config builder
  (live preview in every language, validation, download, import of existing configs).

### create-termcard
- Asks for a description; lets you pick icons and the new themes in the preview.

## 0.1.0 — 2026-11-03

First version.

### termcard
- Interactive card with keyboard menu: email draft, save contact (vCard), open website
  and profiles, copy email/phone, language picker, custom URL items.
- JSON config with full validation and readable error messages.
- Templates `classic`, `compact`, `minimal`; themes `gold`, `ocean`, `sage`, `rose`,
  `violet`, `mono` plus custom hex colors; border, name, spacing, label, field and menu
  options.
- Languages: English, Turkish, German, Spanish, French; automatic detection, `--lang`,
  per-card text overrides and custom languages.
- `termcard preview | validate | build`; build writes ANSI/plain cards, vCards, a web page
  and curl integrations (Cloudflare Workers, Next.js/Vercel, Netlify).

### create-termcard
- Wizard with live preview, template/color picker, npm name availability check and
  optional publishing; non-interactive mode with `--config`.
