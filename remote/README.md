# Remote MCP server

termcard's MCP server over HTTPS, so Claude can use termcard in chat on the web, desktop
and mobile — not only where local servers run. It's the same code as the local server
(`packages/termcard/src/mcp/http.js`), deployed as a Cloudflare Worker.

Differences from the local server:

- **No file writes.** `create_card_project` is replaced by `export_card_config`, which hands
  the finished `card.config.json` back to the user with the commands to publish it.
- **Stateless.** Every request is answered on its own; nothing is stored between requests.
- **Public data only.** No sign-in: it reads published cards from the npm registry and
  validates designs. Browser origins are rejected unless listed in `ALLOWED_ORIGINS`.

## Deploy

One-time setup, in a Cloudflare account:

1. Create an API token with the **Edit Cloudflare Workers** template.
2. Add two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Optional: set a custom domain in `wrangler.toml` (`routes`).

Then run **Actions → Deploy remote MCP → Run workflow**, or locally:

```bash
npx wrangler deploy --config remote/wrangler.toml
```

The endpoint is `https://<worker>.<account>.workers.dev/mcp` (or your domain + `/mcp`).
termcard's own deployment: `https://termcard-mcp.aepasahan-dev.workers.dev/mcp`.
Add it in Claude under **Settings › Connectors › Add custom connector** to test it.
