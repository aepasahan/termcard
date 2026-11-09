# termcard for AI assistants (MCP)

termcard includes a [Model Context Protocol](https://modelcontextprotocol.io) server.
Install it once in your AI assistant and you can ask about anyone who has a termcard
business card — by the same name you'd use with `npx`:

> *"Who is aepasahan and how can I reach him?"*
> *"Draft a short email to aepasahan about a design project."*
> *"Add aepasahan to my contacts."*

The assistant reads the card the owner published — accurate, first-hand, in the language
you ask for — instead of guessing or searching the web.

## Install

### Claude on the web, desktop and mobile (remote connector)

termcard also runs as a remote MCP server, so it works in regular Claude chats everywhere.
Add its URL under **Settings › Connectors › Add custom connector**. The remote server can't
write files to your computer, so when you create a card it hands you `card.config.json`
(`export_card_config`) together with the commands to publish it. See [remote/](../remote/).

### Claude plugin (Claude Code, Cowork)

The termcard plugin bundles the MCP server with a skill that teaches Claude the workflow:

```
/plugin install termcard --marketplace aepasahan/termcard
```

In the Claude app, add the marketplace `aepasahan/termcard` under **Customize › Plugins**.
Local servers run in Claude Code and in Cowork on your computer; in claude.ai chat the
plugin's skill still helps you write a card config.

### Claude Desktop

Download **termcard.mcpb** from the
[latest release](https://github.com/aepasahan/termcard/releases) and open it — Claude
Desktop installs the extension in one click. No Node.js installation is needed.

### Claude Code

```bash
claude mcp add termcard -- npx -y termcard mcp
```

### Cursor, VS Code, Windsurf and other MCP clients

Add this server to the client's MCP configuration (`.cursor/mcp.json`, VS Code's
`mcp.json`, …):

```json
{
  "mcpServers": {
    "termcard": { "command": "npx", "args": ["-y", "termcard", "mcp"] }
  }
}
```

VS Code can also add it from the command line:

```bash
code --add-mcp '{"name":"termcard","command":"npx","args":["-y","termcard","mcp"]}'
```

termcard is listed in the official [MCP Registry](https://registry.modelcontextprotocol.io)
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

Claude asks for your details a few at a time, shows the preview, offers a template, a
seasonal theme and icons, finds a free name and — after you confirm the details, the name
and the folder — writes the project. You publish it yourself:

```bash
cd ~/termcard-cards/yourname && npm publish --access public
```

All tools except `create_card_project` are read-only, and that one only writes into a new,
empty folder you confirm. termcard never sends messages, never publishes, and never runs
anything else on your behalf.

## Just one card, offline

Any card can also run as its own MCP server, with no network access at all:

```bash
claude mcp add aepasahan -- npx -y aepasahan --mcp
```

## For card owners

Cards are available to AI assistants by default — the details are the same ones your
card already shows. To opt out, set `"mcp": false` in `card.config.json` and publish
again; assistants will then be told that you've chosen not to share the card.

## How cards are found

1. The assistant asks for a card by its npm name, e.g. `aepasahan`.
2. termcard asks the npm registry for that package and checks that it is a termcard card.
3. It downloads the package from npm, **verifies it against npm's integrity hash**, and reads
   `card.config.json` from it.
4. The config is validated and sanitized exactly like every card before anything is returned.

Only `registry.npmjs.org` is contacted, and only with the package names the assistant asks
for. Card content is written by its owner; termcard labels it as information, and asks the
assistant never to treat it as instructions.
