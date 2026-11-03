# Configuration reference

A card is a single `card.config.json` file. Only `name` is required; everything
else is optional and has a sensible default. Run `npx termcard validate` to check
a config — every problem is listed with its path.

JSON is the only accepted format on purpose: a config can never execute code.

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "links": ["https://github.com/janedoe"]
}
```

See [`examples/full.json`](../examples/full.json) for a config that uses every option.

## Profile

| Key            | Type               | Notes |
| -------------- | ------------------ | ----- |
| `name`         | string             | **Required.** At most 80 characters. |
| `title`        | localized string   | Role, shown under the name. |
| `tagline`      | localized string   | Company, handle or slogan, shown in the accent color. |
| `description`  | localized string   | A few sentences about you, up to 280 characters. Wrapped to the card width. |
| `organization` | string             | Used in the vCard only. |
| `email`        | string             | Enables the *Get in touch* and *Copy email* actions. Characters that would change a `mailto:` link (`? & # % /`) are not allowed. |
| `phone`        | string             | Digits, spaces and `+ ( ) - .` only. |
| `website`      | URL                | `https://` or `http://`. |
| `location`     | localized string   | Shown at the bottom of the card. |
| `links`        | array              | URLs, or `{ "url", "label"?, "id"?, "icon"? }`. |

A **localized string** is either plain text or an object keyed by language:
`{ "en": "Designer", "tr": "Tasarımcı" }`. Missing languages fall back to English,
then to the first entry.

**Links** for well-known services (LinkedIn, GitHub, X, Instagram, Behance,
Dribbble, YouTube, Medium, Bluesky, and more) get their label and `id`
automatically. Other links use the domain; set `label` to change it. The `id` is
how you refer to the link in `card.fields` and `menu.items`.

Text is limited to 120 characters per field (280 for `description`). Control characters and
text-direction overrides are removed automatically.

## Languages

```json
"language": { "default": "auto", "available": ["en", "tr"] }
```

- `available` — languages the card supports. Built in:
  `en` English, `zh` Chinese (Simplified), `hi` Hindi, `es` Spanish, `ar` Arabic, `fr` French,
  `bn` Bengali, `pt` Portuguese, `ru` Russian, `id` Indonesian, `ur` Urdu, `de` German,
  `ja` Japanese, `tr` Turkish.
- `default` — `"auto"` (detect) or a language code that is always used.

`"language": "de"` is shorthand for a card that exists in German only.

With `"auto"`, the language is chosen from: the `--lang` flag, the
`TERMCARD_LANG` environment variable, the system locale (`LC_ALL`,
`LC_MESSAGES`, `LANG`, `LANGUAGE`, then the OS locale), and finally English.
When more than one language is available, visitors can switch from the menu.

### Custom text and new languages

Every interface text can be overridden per language under `strings`. The keys are
listed in [`packages/termcard/src/i18n/locales/en.js`](../packages/termcard/src/i18n/locales/en.js).

```json
"strings": {
  "en": { "action.contact": "Start a project" },
  "ja": { "meta.name": "日本語", "action.exit": "終了" }
}
```

A language that is not built in can be added to `available` once it has an entry
under `strings`; untranslated keys fall back to English.

### Right-to-left languages

Arabic and Urdu are written right to left; custom languages can declare this with
`"meta.dir": "rtl"` in their `strings`. Terminals that support bidirectional text (for
example macOS Terminal and iTerm2) display these lines correctly; the web page sets the
page direction automatically. Names in scripts without capital letters — Arabic,
Devanagari, Chinese and others — are never letter-spaced, so their letters stay joined.

## Look

### `template`

| Template  | Description |
| --------- | ----------- |
| `classic` | Default. Letter-spaced name on two lines, generous spacing, location on the right. |
| `compact` | Name on one line, tighter spacing. Good for long names. |
| `minimal` | No frame and no labels. |

### `theme`

Eight themes named after the seasons and the turns between them:

| Theme       | Season                     | Accent    |
| ----------- | -------------------------- | --------- |
| `thaw`      | late winter → spring       | `#5fafaf` |
| `bloom`     | spring                     | `#87af5f` |
| `blossom`   | spring → summer            | `#d787af` |
| `solstice`  | summer — **default**       | `#d7af5f` |
| `ember`     | summer → autumn            | `#d7875f` |
| `harvest`   | autumn                     | `#af875f` |
| `frost`     | autumn → winter            | `#87afd7` |
| `midwinter` | winter                     | `#8787af` |

Only the accent changes between themes. Main text uses the terminal's own color and
the grays are mid-tones, so every theme stays readable on dark **and** light terminal
backgrounds. Accents are exact xterm-256 colors, so they look the same everywhere.

Start from a theme and override any role (`accent`, `text`, `muted`, `faint`) with a
hex color, or `"default"` for the terminal's own color:

```json
"theme": { "preset": "frost", "accent": "#ff8700" }
```

Terminals without 24-bit color get the closest of the 256 standard colors. `NO_COLOR`
is respected.

### `icons`

| Value     | |
| --------- | --- |
| `none`    | Default. Text only. |
| `symbols` | Simple symbols every terminal font has: ✉ ⌂ ☎ ◎ ↗ |
| `emoji`   | Colorful emoji, best on macOS and modern terminals. |
| `nerd`    | Brand icons (GitHub, LinkedIn, X …). Visitors need a [Nerd Font](https://www.nerdfonts.com); the web page falls back to `symbols`. |

Icons appear before the contact rows, the location and menu entries. Any link can set
its own: `{ "url": "https://example.com", "icon": "★" }`.

### `card`

Set `"card": false` to hide the card and show only the menu, with a one-line header
(name, tagline, description). When the menu cannot be shown — output piped to a file,
or `--card` — the details are printed in the `minimal` layout instead.

Otherwise, every option below overrides the template's value.

| Key             | Values | |
| --------------- | ------ | --- |
| `fields`        | array of field ids | What the card shows, in order: `website`, `email`, `phone`, link ids, `location`. Defaults to everything you filled in. |
| `border`        | `rounded` `square` `double` `heavy` `none` | |
| `nameStyle`     | `spaced` `uppercase` `plain` | |
| `splitName`     | boolean | Last name on its own line. |
| `spacing`       | `relaxed` `compact` | |
| `accentRule`    | boolean | Short accent line under the tagline. |
| `labels`        | boolean | Show `Email`, `GitHub` … before values. |
| `locationAlign` | `left` `right` | |
| `padding`       | 0–8 | Spaces inside the frame. |
| `width`         | `"auto"` or 20–120 | Minimum outer width. |

## Menu

```json
"menu": { "items": ["contact", "save", "website", "links", "copy-email", "language", "exit"] }
```

That list is the default. Items without the data they need (for example `contact`
without an `email`) are skipped; if nothing is left, the card is printed without a
menu. Set `"menu": false` to always print the card only.

| Item          | Action |
| ------------- | ------ |
| `contact`     | Opens a new email draft. |
| `save`        | Opens the contact card (vCard) in the address book. |
| `website`     | Opens the website. |
| `links`       | One entry per link. |
| `link:<id>`   | A single link, e.g. `link:github`. |
| `copy-email`  | Copies the email address. |
| `copy-phone`  | Copies the phone number. |
| `language`    | Language picker (only with 2+ languages). |
| `exit`        | Closes the card. |
| `{ "label", "url", "hint"? }` | Custom entry that opens a URL. `label` and `hint` can be localized. |

## AI assistants

```json
"mcp": true
```

Cards can be read by AI assistants through termcard's MCP server (see [mcp.md](mcp.md)).
This is on by default and shares only what the card already shows. Set `"mcp": false` to
opt out.

## Command-line flags

Everyone running your card can use:

| Flag            | |
| --------------- | --- |
| `--lang <code>` | Show a specific language. |
| `--card`        | Print the card without the menu (also automatic when output is piped). |
| `--vcard`       | Print the vCard. |
| `--json`        | Print the card details as JSON. |
| `--no-color`    | Disable colors. |
| `--mcp`         | Run the card as an MCP server for AI assistants. |

## Beyond the terminal

`npx termcard build` (or `npm run build` in your card package) writes to `dist/`:

| File | |
| ---- | --- |
| `card.<lang>.ansi` / `card.<lang>.txt` | The card with / without colors. |
| `contact.<lang>.vcf` | vCard per language. |
| `index.html` | A self-contained web version with a language switcher. |
| `integrations/*.js` | Snippets for Cloudflare Workers, Next.js/Vercel and Netlify that make `curl yourdomain.com` print the card. |

This is an optional tool for card owners — visitors never see it, and by default nothing
from `dist/` is published. The curl integrations read the text files from your published
npm package through jsDelivr, so your site picks up new card versions without being
redeployed. To use them, add `"dist"` to `files` and `"prepublishOnly": "termcard build"`
to `scripts` in your card's `package.json`.

For safety, `build` only replaces a folder it created itself (marked with a
`.termcard-build` file); it refuses to write into any other non-empty folder.
