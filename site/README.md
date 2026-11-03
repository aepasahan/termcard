# termcard website and config builder

`index.html` is a single, self-contained page: an introduction to termcard and a
builder that creates `card.config.json` in the browser. It has no build step and no
dependencies besides termcard itself, loaded from jsDelivr
(`termcard@0.2/src/browser.js`), so the preview always uses the real validation and
rendering code.

## Hosting

Copy `index.html` to any static host, e.g. `https://aepasahan.com/termcard/`.
Nothing is uploaded or tracked: the form is processed in the visitor's browser and a
draft is kept only in that browser's local storage.

When a new minor version of termcard changes the config format, update the version in
the `SOURCE` constant.

## Local development

```bash
npx serve .            # or: python3 -m http.server
# open http://localhost:3000/site/index.html?local
```

`?local` (only honored on localhost) loads termcard from `packages/termcard/src`
instead of the CDN.
