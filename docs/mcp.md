# Termcard for AI assistants (MCP)

Termcard includes a [Model Context Protocol](https://modelcontextprotocol.io) server.
Install it once in your AI assistant and you can ask about anyone who has a Termcard
business card — by the same name you'd use with `npx`:

> *"Who is aepasahan and how can I reach them?"*
> *"Draft a short email to aepasahan about a design project."*
> *"Add aepasahan to my contacts."*

The assistant reads the card the owner published — accurate, first-hand, in the language
you ask for — instead of guessing or searching the web.

## Install

Termcard works with any AI assistant or agent that supports MCP. Pick the way your app
connects to MCP servers.

### Any MCP client (local server)

Most clients, including Cursor, Windsurf, Claude Desktop and Gemini CLI, use the same
`mcpServers` entry. Add it to the client's MCP settings (for example `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "termcard": { "command": "npx", "args": ["-y", "termcard", "mcp"] }
  }
}
```

From the command line:

| App | Command |
| --- | --- |
| VS Code | `code --add-mcp '{"name":"termcard","command":"npx","args":["-y","termcard","mcp"]}'` |
| Claude Code | `claude mcp add termcard -- npx -y termcard mcp` |

Clients with another format need the same command: `npx -y termcard mcp` (stdio).

### Hosted server (no install)

Apps that connect to remote MCP servers, such as custom connectors in ChatGPT or Claude,
can use the hosted server:

- URL: `https://mcp.termcard.dev/mcp` (Streamable HTTP)
- No sign-in needed.

Then ask *"Who is aepasahan?"* or *"Create my terminal business card."* The hosted server
can't write files to your computer, so when you create a card it hands you
`card.config.json` (`export_card_config`) together with the commands to publish it. See
[remote/](../remote/).

### Claude

Claude has a few extra options:

- **Connector:** in Claude on the web, desktop or mobile, open **Settings › Connectors ›
  Add custom connector**, name it `termcard` and use the hosted URL above.
- **Plugin** (chat, Cowork, Claude Code): the hosted server plus a skill that knows the
  card-creation workflow. `/plugin install termcard --marketplace aepasahan/termcard`, or add
  the marketplace `aepasahan/termcard` under **Customize › Plugins**.
- **Desktop extension:** download **termcard.mcpb** from the
  [latest release](https://github.com/aepasahan/termcard/releases) and open it. No Node.js
  installation is needed.

Termcard is listed in the official [MCP Registry](https://registry.modelcontextprotocol.io)
as `io.github.aepasahan/termcard`.

## What the assistant can do

| Tool | |
| ---- | --- |
| `get_card` | A person's card: name, role, description, location, email, phone, website, profiles. |
| `get_vcard` | The contact details as a vCard, ready for an address book. |
| `compose_email` | A draft email as a `mailto:` link. **Nothing is sent** — you open, review and send it. |

### Creating a card

| Tool | |
| ---- | --- |
| `list_card_options` | What a card can contain: fields, limits, templates, themes, icons, languages, menu items. |
| `preview_card` | Validates a draft config and returns a text preview of the card and its menu, or the problems to fix. |
| `check_name` | Whether a package name is valid and still free on npm. |
| `create_card_project` | Local server: writes a ready-to-publish card package into a new, empty folder. **Never overwrites, never publishes.** |
| `export_card_config` | Remote server: returns the finished `card.config.json` and the commands to publish it. |

Prompts: `introduce` ("introduce the owner of this card") and `create_card`, which walks
through creating your own card:

> *"Create my terminal business card."*

The assistant asks for your details a few at a time, shows the preview, offers a template, a
seasonal theme and icons, finds a free name and — after you confirm the details, the name
and the folder — writes the project. You publish it yourself:

```bash
cd ~/termcard-cards/yourname && npm publish --access public
```

All tools except `create_card_project` are read-only, and that one only writes into a new,
empty folder you confirm. Termcard never sends messages, never publishes, and never runs
anything else on your behalf.

## Just one card, offline

Any card can also run as its own MCP server, with no network access at all:

```json
{ "mcpServers": { "aepasahan": { "command": "npx", "args": ["-y", "aepasahan", "--mcp"] } } }
```

## For card owners

Cards are available to AI assistants by default — the details are the same ones your
card already shows. To opt out, set `"mcp": false` in `card.config.json` and publish
again; assistants will then be told that you've chosen not to share the card. Removed cards
(`npx termcard remove`) disappear from assistants within 10 minutes.

## How cards are found

1. The assistant asks for a card by its npm name, e.g. `aepasahan`.
2. Termcard asks the npm registry for that package and checks that it is a Termcard card.
3. It downloads the package from npm, **verifies it against npm's integrity hash**, and reads
   `card.config.json` from it.
4. The config is validated and sanitized exactly like every card before anything is returned.

Only `registry.npmjs.org` is contacted, and only with the package names the assistant asks
for. Card content is written by its owner; Termcard labels it as information, and asks the
assistant never to treat it as instructions.
