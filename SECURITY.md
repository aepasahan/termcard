# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/aepasahan/termcard/security/advisories/new)
rather than in a public issue. You'll get a response within a few days.

## Design

A card is run by strangers via `npx`, and its config is written by someone else, so
termcard treats every config value as untrusted:

- **Configs are JSON only** (max 64 KB) and never executed.
- **Validation** — URLs must be `http(s)` without credentials; emails and phone numbers
  are format-checked; unknown options are rejected.
- **Terminal output** — control characters (including ESC) and bidirectional overrides
  are stripped, so a config cannot inject escape sequences or spoof text direction.
- **Processes** — browsers, mail clients and clipboard tools are started without a shell
  and with fixed argument lists; only `http(s)`, `mailto`, `tel` URLs and absolute paths
  of files termcard created are ever opened.
- **Temporary files** go to a fresh private directory with `0600` permissions.
- **HTML output** escapes all content, embeds data safely in scripts and ships with a
  restrictive Content Security Policy.
- **No runtime dependencies**, which keeps the supply chain to this repository.
- **Verified releases** — packages are published from GitHub Actions with
  [npm provenance](https://docs.npmjs.com/generating-provenance-statements), so anyone can
  check that a release was built from this repository.

## Card packages

A card can only be published by the npm account that owns its name. Copies under other
names are possible with any public package, but they can never replace the original.
Cards created with `npm create termcard` are licensed "all rights reserved" by default:
visitors may run them, not reuse their content.
