# termcard for Claude

Create your own terminal business card in a conversation, and look up anyone else's.

[termcard](https://github.com/aepasahan/termcard) cards are small npm packages that show an
interactive business card in the terminal — `npx yourname`. This plugin brings them to Claude:

- **Create your card by chatting.** Claude asks for your details, previews the card, suggests
  a theme and icons, checks that your name is free on npm and writes a ready-to-publish
  project folder. You publish it yourself with `npm publish`.
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
| MCP server `termcard` | Runs `npx -y termcard@0.5.0 mcp` locally. Tools: `get_card`, `get_vcard`, `compose_email`, `list_card_options`, `preview_card`, `check_name`, `create_card_project`. Prompts: `introduce`, `create_card`. |
| Skill `termcard-cards` | Teaches Claude the workflow for looking up and creating cards, and how to help when the tools aren't available. |

The MCP server needs [Node.js](https://nodejs.org) 18.18 or newer. In claude.ai chat, where
local servers don't run, the skill still helps you write `card.config.json`.

## What it runs, sends and writes

- It runs the published [`termcard`](https://www.npmjs.com/package/termcard) package, pinned to
  the version above, through `npx`.
- To look up a card or check a name, it contacts **only** `registry.npmjs.org`, sending the
  package name. Downloaded cards are verified against npm's integrity hash.
- `create_card_project` writes files into a new, empty folder you confirm. It never overwrites
  files, and nothing is ever published or sent on your behalf.

## Privacy Policy

- **Data collection:** the plugin collects no personal data, no analytics and no telemetry.
- **Usage and storage:** card details you share are used only to build the card and are stored
  only in the project folder you choose on your own computer.
- **Third-party sharing:** package names you look up or check are sent to the npm registry
  (`registry.npmjs.org`), as `npx` itself does. Nothing else is shared with anyone.
- **Data retention:** the plugin keeps nothing. Looked-up cards are held in memory for the
  current session only.
- **Contact:** [ae.pasahan@creetivelab.com](mailto:ae.pasahan@creetivelab.com) ·
  [security reports](https://github.com/aepasahan/termcard/security/advisories/new)

The full policy is in [PRIVACY.md](https://github.com/aepasahan/termcard/blob/main/PRIVACY.md).

## License

MIT · Made by [Ahmet Erkan Paşahan](https://aepasahan.com)
