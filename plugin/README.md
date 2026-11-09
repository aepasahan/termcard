# termcard for Claude

Create your own terminal business card in a conversation, and look up anyone else's.

[termcard](https://github.com/aepasahan/termcard) cards are small npm packages that show an
interactive business card in the terminal — `npx yourname`. This plugin brings them to Claude:

- **Create your card by chatting.** Claude asks for your details, previews the card, suggests
  a theme and icons, checks that your name is free on npm and hands you a ready
  `card.config.json` with the two commands to publish it.
- **Look people up.** Ask *"Who is aepasahan and how can I reach him?"* and Claude reads that
  person's card — first-hand information, in your language.
- **Save contacts and draft emails.** Claude returns a vCard, or a draft email as a `mailto:`
  link that you review and send yourself.

## Install

In Claude Code:

```
/plugin install termcard --marketplace aepasahan/termcard
```

In the Claude app, add the marketplace `aepasahan/termcard` under **Customize › Plugins**.

## What's inside

| Component | |
| --------- | --- |
| MCP server `termcard` | termcard's hosted MCP server at `https://mcp.termcard.dev/mcp` (no sign-in). Tools: `get_card`, `get_vcard`, `compose_email`, `list_card_options`, `preview_card`, `check_name`, `export_card_config`. Prompts: `introduce`, `create_card`. |
| Skill `termcard-cards` | Teaches Claude the workflow for looking up and creating cards, and how to help when the tools aren't available. |

It works in Claude chat on the web, desktop and mobile, in Cowork and in Claude Code — nothing to
install. Prefer a local server that can also write the project folder for you? Use
`claude mcp add termcard -- npx -y termcard mcp` instead (needs Node.js 18.18+).

## What it runs, sends and writes

- It connects to termcard's MCP server at `https://mcp.termcard.dev/mcp`, hosted on Cloudflare Workers. The
  server's source is the open-source [`termcard`](https://github.com/aepasahan/termcard) package.
- To look up a card or check a name, the server contacts **only** `registry.npmjs.org`, sending
  the package name. Downloaded cards are verified against npm's integrity hash.
- It writes nothing to your computer: a card you create is handed to you as `card.config.json`
  with the commands to publish it. Nothing is ever published or sent on your behalf.

## Privacy Policy

- **Data collection:** the plugin collects no personal data, no analytics and no telemetry.
- **Usage and storage:** card details you share are used only to validate, preview and export
  the card during the request. The server is stateless and stores nothing.
- **Third-party sharing:** requests are processed by Cloudflare as the hosting provider, and
  package names you look up or check are sent to the npm registry (`registry.npmjs.org`).
  Nothing else is shared with anyone.
- **Data retention:** no request logs and no stored data; looked-up cards are cached in memory
  briefly and then discarded.
- **Contact:** [ae.pasahan@creetivelab.com](mailto:ae.pasahan@creetivelab.com) ·
  [security reports](https://github.com/aepasahan/termcard/security/advisories/new)

The full policy is in [PRIVACY.md](https://github.com/aepasahan/termcard/blob/main/PRIVACY.md).

## License

MIT · Made by [Ahmet Erkan Paşahan](https://aepasahan.com)
