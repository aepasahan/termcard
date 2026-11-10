<div align="center">

# Termcard

**Your business card, in the terminal.**

Created by [Ahmet Erkan Paşahan](https://aepasahan.dev)

[![npm](https://img.shields.io/npm/v/termcard?color=87afd7&label=npm)](https://www.npmjs.com/package/termcard)
[![Tests](https://img.shields.io/github/actions/workflow/status/aepasahan/termcard/ci.yml?branch=main&label=tests)](https://github.com/aepasahan/termcard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/aepasahan/termcard/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518.18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Modules)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/termcard?activeTab=dependencies)

<img src="https://raw.githubusercontent.com/aepasahan/termcard/main/docs/demo.gif" width="560" alt="Animated demo: running npx aepasahan shows a business card with a menu, then switches the card to Turkish">

</div>

## What is it?

Termcard is the engine behind interactive terminal business cards. You describe yourself
in a small JSON file; Termcard draws the card, runs the menu, speaks your visitor's
language and keeps everything safe. Anyone can then meet you with:

```bash
npx yourname
```

**You don't need to install this package yourself.** To create a card, run the wizard —
it sets everything up and publishes the card for you:

```bash
npm create termcard@latest
```

## What your visitors can do

- **Get in touch** — opens a new email to you in their mail app
- **Save contact** — adds your vCard to their address book
- **Visit your website and profiles** — LinkedIn, GitHub, X, Behance, Dribbble and more
- **Copy your email or phone number** to the clipboard
- **Switch language** — 14 languages, from English, Chinese and Hindi to Arabic and Urdu (right to left), detected automatically

Flags such as `--lang tr`, `--card` (no menu) and `--vcard` work on every card.

## Features

- **One validated JSON file** instead of code to fork and edit.
- **Eight seasonal themes** (*thaw, bloom, blossom, solstice, ember, harvest, frost, midwinter*) that read well on dark and light terminals.
- **Three layouts**, optional **icons** (symbols, emoji or Nerd Font), a short **description**, and full control over which details and menu items appear — or a menu-only card.
- **Your own wording and languages** — every text can be changed and new languages added.
- **Zero dependencies, no tracking.** Values are validated and sanitized, links are restricted to web, email and phone, and no command ever runs through a shell.

## Ask your AI assistant

Termcard includes an MCP server, so in Claude and other AI assistants you can **create your
card by chatting** and look up anyone's card by name, save them as a contact or draft an
email. Nothing is ever published or sent on your behalf.

```bash
claude mcp add termcard -- npx -y termcard mcp
```

Claude Desktop extension and setup for Cursor, VS Code and other clients:
[Termcard for AI assistants](https://github.com/aepasahan/termcard/blob/main/docs/mcp.md).

## For card owners

```bash
npx termcard preview     # see your card exactly as visitors will
npx termcard validate    # check card.config.json and explain any mistakes
npx termcard build       # optional: web page, vCards and curl files for your own website
npx termcard mcp         # MCP server for AI assistants
```

Using Termcard in your own package takes two lines:

```js
#!/usr/bin/env node
import { start } from 'termcard';

await start(new URL('../card.config.json', import.meta.url));
```

Every option is described in the
[configuration guide](https://github.com/aepasahan/termcard/blob/main/docs/configuration.md).

## Requirements

Node.js 18.18 or newer, on macOS, Linux or Windows.

---

<div align="center">

Designed and built by **[Ahmet Erkan Paşahan](https://aepasahan.dev)** ·
[LinkedIn](https://www.linkedin.com/in/aepasahan) · [GitHub](https://github.com/aepasahan/termcard) ·
try it: `npx aepasahan`

MIT License

</div>
