# Changelog

All notable changes are documented here. This project follows
[Semantic Versioning](https://semver.org); until 1.0.0, minor versions may contain
breaking changes to the config format.

## termcard 0.4.0, create-termcard 0.4.0 — 2026-11-03

### termcard
- **MCP server for AI assistants.** `termcard mcp` lets Claude and other MCP clients look up
  any termcard card by its npm name; `npx <card> --mcp` serves a single card offline.
  Tools: `get_card`, `get_vcard`, `compose_email` (draft only); prompt: `introduce`.
- Cards are fetched only from the npm registry and verified against npm's integrity hash.
- New `mcp` option (default `true`) lets card owners opt out.
- Claude Desktop extension (`termcard.mcpb`) attached to each GitHub release, and an entry
  in the official MCP Registry (`io.github.aepasahan/termcard`).

### create-termcard
- Generated READMEs mention that the card works with AI assistants.

## termcard 0.3.0, create-termcard 0.3.1 — 2026-11-03

### termcard
- Nine new languages: Chinese, Hindi, Arabic, Bengali, Portuguese, Russian, Indonesian,
  Urdu and Japanese — fourteen in total.
- Right-to-left support: Arabic and Urdu are marked RTL (custom languages via
  `"meta.dir": "rtl"`), the web page switches direction, and `textDirection()` is exported.
- Combining marks (Arabic, Hebrew, Devanagari, Bengali, Japanese) no longer shift the frame.
- Names in scripts without case are no longer letter-spaced.

### Docs
- Landscape demo GIF that pans between the card and the menu.

## termcard 0.2.1, create-termcard 0.3.0 — 2026-11-03

### create-termcard
- Card packages publish only the card itself: `dist/` is no longer included or built on
  publish (enable it manually for curl integrations).
- Two READMEs: `README.md` is a short public introduction for the npm page,
  `.github/README.md` holds the owner's maintenance notes on GitHub.
- Card content is licensed "all rights reserved" by default (visitors may run the card,
  not reuse it). termcard itself stays MIT.

### All packages
- New READMEs with a demo, badges and clearer explanations.
- Releases are published with npm provenance once the repository is public.
- The website and browser config builder (`site/`) moved out of this repository; the
  `termcard/browser` entry point it uses remains part of termcard.

## 0.2.0 — 2026-11-03

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
