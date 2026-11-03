<div align="center">

# create-termcard

**Create and publish your terminal business card in about two minutes.**

Created by [Ahmet Erkan Paşahan](https://aepasahan.com)

[![npm](https://img.shields.io/npm/v/create-termcard?color=87afd7&label=npm)](https://www.npmjs.com/package/create-termcard)
[![Tests](https://img.shields.io/github/actions/workflow/status/aepasahan/termcard/ci.yml?branch=main&label=tests)](https://github.com/aepasahan/termcard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/aepasahan/termcard/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518.18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Modules)

<img src="https://raw.githubusercontent.com/aepasahan/termcard/main/docs/demo.gif" width="560" alt="Animated demo of a finished termcard business card">

</div>

## What is it?

This is the setup wizard for [termcard](https://www.npmjs.com/package/termcard). It turns
a few answers into a published business card that anyone can open with `npx yourname` —
no code, no templates to fork.

```bash
npm create termcard@latest
```

## How it works

1. **Tell it about you.** Name, role, a short description, email, website and profiles.
   Everything except your name is optional.
2. **Choose your languages.** English, Turkish, German, Spanish and French are built in.
3. **Make it yours.** A live preview lets you switch between three layouts, eight seasonal
   color themes and icon styles until it looks right.
4. **Pick a name.** The wizard checks that it's free on npm.
5. **Publish.** Say yes and it signs you in to npm if needed and publishes your card.

Afterwards, share your card with:

```bash
npx yourname
```

To change anything later, edit `card.config.json` in the created folder and publish again.

## Without the wizard

Already have a `card.config.json`? Create the package from it directly:

```bash
npm create termcard@latest -- --config card.config.json --name yourname --publish
```

Run with `--help` to see every option.

## Privacy

Everything you enter becomes public once your card is published, so share only what you're
comfortable with. The wizard sends nothing anywhere except your chosen package name to npm,
to check whether it's available (skip this with `--offline`).

## Requirements

Node.js 18.18 or newer, on macOS, Linux or Windows, and a free [npm account](https://www.npmjs.com/signup)
to publish.

---

<div align="center">

Designed and built by **[Ahmet Erkan Paşahan](https://aepasahan.com)** ·
[LinkedIn](https://www.linkedin.com/in/aepasahan) · [GitHub](https://github.com/aepasahan/termcard) ·
try it: `npx aepasahan`

MIT License

</div>
