# Changelog

All notable changes are documented here. This project follows
[Semantic Versioning](https://semver.org): from 1.0.0 on, a config that works keeps working
until the next major version.

## termcard 1.6.0, create-termcard 1.6.0 — 2026-11-27

### termcard
- **QR codes, two of them.** The QR entry lets the visitor pick: one saves the contact, one
  opens the website. A contact too long for a QR code is shortened to the name, organization,
  phone, email and website instead of being dropped.
- **Profiles behind one entry.** `"menu": { "links": "list" }` puts profile links behind a
  single *Profiles and links* entry. The default for organizations; people's menus are unchanged.
- **Address view.** The `address` menu entry shows the full address with *Open in maps* and
  *Copy address*. Organizations show their address this way instead of printing it on the card
  (`card.fields` can still put it there); people's cards are unchanged.

## termcard 1.5.0, create-termcard 1.5.0 — 2026-11-27

### termcard
- **Organization cards.** `"type": "organization"` introduces a company, studio, team or
  project: the name reads as one unit, *Save contact* creates a company card, and the default
  menu leads with contact, the QR code and the organization's sections.
- **Address and hours**, localizable rows; a long address wraps on the card and goes into the vCard.
- **Logo:** up to 8 lines of text art above the name, in the accent color.
- **Sections:** lists the menu opens, such as Services, Products, Projects, Talks or Open roles,
  with descriptions and links.
- **QR code:** a menu entry that shows the contact as a QR code, black on white in any terminal,
  from a small dependency-free encoder. On by default for organizations; people can add `"qr"`
  to `menu.items`. Existing cards look the same.
- The interactive menu keeps a stack of views (language picker, section lists, QR code); esc goes back.
- Under the hood: config validation is split into one module per part of the config.

## termcard 1.4.0, create-termcard 1.4.0 — 2026-11-26

### termcard
- **`"credit": true`** shows a small "Made with Termcard · termcard.dev" line under the card,
  in the terminal and on the web page. It is off unless set, so existing cards look the same;
  new cards from the wizard and from AI assistants start with it on, and anyone can turn it off.

## termcard 1.3.0, create-termcard 1.3.0 — 2026-11-26

### termcard
- **Your own menu icons:** `"menu": { "icons": { "contact": "✦", "save": "★" } }` sets the
  symbol for any built-in menu entry, and custom menu entries take an `icon` too.

## termcard 1.2.0, create-termcard 1.2.0 — 2026-11-26

### termcard
- **Card background:** `"theme": { "background": "#1d1b16" }` fills the card from border to
  border, in the terminal and on the web page; two colors (`["#1d2433", "#2e1d33"]`) make a
  left-to-right gradient. With the terminal's own text color, a readable one is picked for you.
- **Letter spacing for your name:** `"card": { "letterSpacing": 0–3 }` sets the gap between
  letters with any `nameStyle`, so a spaced name can be tighter or wider, and a plain one can
  be spaced too.
- **`npx termcard demo`** opens a sample card (John Doe, with example details) in six
  languages, so anyone can see what Termcard does before making their own.

### Docs
- Termcard works with any AI assistant or agent that supports MCP; the READMEs and the MCP
  guide now start from the standard setup (local server or hosted URL), with Claude's plugin,
  connector and desktop extension as one of the options.

## termcard 1.1.0, create-termcard 1.1.0 — 2026-11-26

### termcard
- **`npx termcard remove`** takes your published card off npm, so your details stop being
  public. Run it in the card's folder (or name the card); after you type the name to confirm,
  it deletes every version with your own npm account. When npm's unpublish policy doesn't
  allow that, it marks the card as removed instead and explains how to ask npm support to
  delete it.
- AI assistants no longer show cards that were removed or deprecated on npm.

### create-termcard
- Publishing uses the npm helper shared with `termcard remove`.

## termcard 1.0.0, create-termcard 1.0.0 — 2026-11-11

Termcard is stable. No breaking changes since 0.7.0 — 1.0 is a promise about what comes next:

- **`card.config.json` is stable.** Configs that are valid today stay valid and look the same
  in every 1.x release. New features arrive as optional fields; nothing is renamed or removed
  before 2.0. The [JSON Schema](https://termcard.dev/schema.json) describes the 1.x format.
- **The command line, the MCP tools and the library's exported functions** follow the same rule.
- Cards created from now on depend on `termcard ^1.0.0`, so they receive every 1.x update
  automatically. Cards created with 0.x keep working; run `npm install termcard@latest` in
  your card's folder and publish again to move to 1.x.

### Website
- termcard.dev offers the card builder to AI agents in the browser (WebMCP), and serves
  `llms.txt`, `robots.txt`, a sitemap and a social preview image.

## termcard 0.7.0, create-termcard 0.7.0 — 2026-11-10

### termcard
- **JSON Schema for card.config.json** at `https://termcard.dev/schema.json` (also
  `termcard/schema.json` in the package): autocompletion and inline errors in editors. It is
  generated from the validator's own rules (`npm run schema`), and tests check it stays in sync
  and agrees with the validator on valid and invalid configs.
- Configs written by `npm create termcard` and by Claude (`export_card_config`,
  `create_card_project`) start with `"$schema"`.
- The short accent line under the tagline is only drawn when there is a tagline.

### Website
- termcard.dev — introduction, live demo, Termcard in Claude, and the config builder — is
  live on Vercel, from its own repository. The hosted MCP server no longer answers on
  termcard.dev, only on mcp.termcard.dev.

## termcard 0.6.2, create-termcard 0.6.2 — 2026-11-10

### Brand
- The product is written "Termcard" everywhere people read it: READMEs, docs, the Claude plugin
  and skill, the Desktop extension, the MCP Registry entry, tool and prompt descriptions, CLI
  and wizard text and error messages. Commands, package names and code identifiers stay
  lowercase (`npx termcard`, `termcard`).

### Remote MCP server
- Rate limit per client IP (Workers rate limiting binding, 600 requests/minute) to protect
  the free request quota; Claude's shared proxy IPs keep plenty of headroom.
- Serves the icon at `/favicon.ico` and `/icon.png` for directories and clients.
- Looked-up cards are cached for 10 minutes at most and the cache is capped, so card updates
  show up and memory stays bounded.
- Scheduled health check (GitHub Actions, plain HTTP, every six hours).

### MCP server
- Server info includes the Termcard icon and website (`icons`, `websiteUrl`), so clients can
  show them.

## termcard 0.6.1, create-termcard 0.6.1 — 2026-11-09

### Project
- Contact address is now hello@termcard.dev; author links point to https://aepasahan.dev.
- Claude plugin: listing icon (`.claude-plugin/icon.png`) and `privacyPolicyUrl`.
- Display name "Termcard" in the Claude plugin, the Desktop extension, the MCP Registry and the
  MCP server info; package and command names stay `termcard`.

### Remote MCP server
- The endpoint also accepts `/mcp/` and MCP requests on the root (`https://mcp.termcard.dev`),
  so connectors configured with a trailing slash or the bare domain work.

## termcard 0.6.0, create-termcard 0.6.0 — 2026-11-09

### Remote MCP server
- `termcard/http`: the MCP server as a stateless Streamable HTTP handler
  (`createMcpHttpHandler`), for Claude on the web, desktop and mobile.
- `remote/`: Cloudflare Workers deployment (`wrangler.toml`) and a manual
  "Deploy remote MCP" workflow.
- New `export_card_config` tool (remote): returns the finished `card.config.json` and the
  commands to publish it, instead of writing files.
- MCP tools are organized by what they touch: `lookup.js`, `design.js` (no file system) and
  `project.js` (local only).
- termcard's hosted server lives at `https://mcp.termcard.dev/mcp`; `termcard.dev` redirects to
  the project page for now.

### Claude plugin
- Uses the hosted server instead of `npx`, so it works in Claude chat on the web, desktop and
  mobile without Node.js; cards are handed back with `export_card_config`.

### MCP Registry
- The entry lists the hosted server (`remotes`) next to the npm package.

### create-termcard
- Version aligned with termcard 0.6.0; no changes of its own.

## termcard 0.5.0, create-termcard 0.5.0 — 2026-11-09

### termcard
- **Create a card by chatting.** New MCP tools `list_card_options`, `preview_card`,
  `check_name` and `create_card_project`, and a `create_card` prompt. Only
  `create_card_project` writes files — into a new, empty folder — and nothing is published.
- Every tool now declares its title and whether it is read-only.
- Names on cards that include Turkish or Azerbaijani are capitalized with those rules in
  every language (Elif → ELİF).
- Project scaffolding, package-name rules and the npm availability check moved from
  create-termcard into termcard (`createProject`, `validatePackageName`, `checkAvailability`),
  so the wizard and the MCP server share one implementation.

### Claude plugin
- New `plugin/` (with `.claude-plugin/marketplace.json`): the MCP server pinned to this
  version plus a `termcard-cards` skill. Install with
  `/plugin install termcard --marketplace aepasahan/termcard`.
- The Claude Desktop extension lists the new tools and prompts and links the privacy policy.

### create-termcard
- Uses termcard's scaffolding; READMEs mention creating a card by chatting.

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
