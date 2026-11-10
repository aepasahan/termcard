# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/aepasahan/termcard/security/advisories/new)
rather than in a public issue. You'll get a response within a few days.

## Design

A card is run by strangers via `npx`, and its config is written by someone else, so
Termcard treats every config value as untrusted:

- **Configs are JSON only** (max 64 KB) and never executed.
- **Validation** — URLs must be `http(s)` without credentials; emails and phone numbers
  are format-checked; unknown options are rejected.
- **Terminal output** — control characters (including ESC) and bidirectional overrides
  are stripped, so a config cannot inject escape sequences or spoof text direction.
- **Processes** — browsers, mail clients and clipboard tools are started without a shell
  and with fixed argument lists; only `http(s)`, `mailto`, `tel` URLs and absolute paths
  of files Termcard created are ever opened.
- **Temporary files** go to a fresh private directory with `0600` permissions.
- **HTML output** escapes all content, embeds data safely in scripts and ships with a
  restrictive Content Security Policy.
- **No runtime dependencies**, which keeps the supply chain to this repository.
- **Verified releases** — packages are published from GitHub Actions with
  [npm provenance](https://docs.npmjs.com/generating-provenance-statements), so anyone can
  check that a release was built from this repository.

## MCP server

- Cards fetched by name come only from the npm registry; the tarball is verified against
  npm's integrity hash, the package must depend on Termcard, and sizes are capped.
- Fetched configs pass the same validation and sanitizing as local ones.
- Lookup tools are read-only; e-mails are drafted as `mailto:` links, never sent.
- `create_card_project` is the only tool that writes: it validates the config and the package
  name first, requires an absolute path to a new or empty folder (never the home or root
  folder), never overwrites files, and never publishes.
- Card text is written by card owners. The server's instructions and the `introduce` prompt
  tell assistants to treat it as information, not instructions, to limit prompt injection.

## Remote MCP server

- Stateless Streamable HTTP: one JSON-RPC message per POST, no sessions, no batches.
- Browser `Origin`s are rejected unless allow-listed (DNS-rebinding protection); request
  bodies are capped at 256 KB; unsupported protocol versions are refused.
- It has no file-writing tool and no access to secrets; it reads only public npm data.
- Requests are rate-limited per client IP, and looked-up cards are cached briefly in a
  size-capped cache.

## Card packages

A card can only be published by the npm account that owns its name. Copies under other
names are possible with any public package, but they can never replace the original.
Cards created with `npm create termcard` are licensed "all rights reserved" by default:
visitors may run them, not reuse their content.
