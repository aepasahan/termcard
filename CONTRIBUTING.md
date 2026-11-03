# Contributing

Thanks for helping! Issues and pull requests are welcome.

## Setup

```bash
git clone https://github.com/aepasahan/termcard
cd termcard
npm install        # links the workspace packages; there are no external dependencies
npm test
```

Try your changes:

```bash
node packages/termcard/bin/termcard.js preview examples/full.json
node packages/create-termcard/bin/create-termcard.js --offline
```

## Layout

```
packages/termcard/src
  config/     validation, defaults, templates, themes, known services
  i18n/       language detection and locales (one file per language)
  render/     card layout and ANSI / plain / HTML output
  tui/        interactive menu
  build/      web page, vCards, curl integrations
  system.js   the only module that starts other programs
packages/create-termcard/src
  wizard.js   questions · scaffold.js files · npm.js registry/publish · prompts.js UI
```

## Guidelines

- Keep it dependency-free and compatible with Node 18.18+ on macOS, Linux and Windows.
- Every config value is untrusted: validate in `config/schema.js`, never pass it to a shell.
- Add or update tests (`node --test`) for any behavior change.
- **Adding a language:** copy `packages/termcard/src/i18n/locales/en.js`, translate every
  key, register it in `i18n/index.js`. A test checks that all locales have the same keys.
- Note user-facing changes in `CHANGELOG.md`. Versions follow [Semantic Versioning](https://semver.org).
