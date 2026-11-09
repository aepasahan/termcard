# Privacy

termcard is designed so that no personal data about the people who run a card is
collected, stored or transmitted.

## People running a card (`npx <name>`)

- **No tracking, analytics or telemetry.** A card makes no network requests of its own.
- Actions such as *Get in touch*, *Visit website* or *Copy email* hand a link to the
  visitor's own email client, browser or clipboard, only when they choose that action.
- *Save contact* writes the card owner's vCard to a private temporary folder
  (permissions `0600`) on the visitor's machine and opens it. Nothing about the visitor
  is written.
- Language detection reads local environment variables only; the result is never sent
  anywhere.

npm itself records anonymous download counts for public packages. This is outside
termcard's control and covered by the [npm privacy policy](https://docs.npmjs.com/policies/privacy).

## Card owners (`npm create termcard`)

- Everything you enter in the wizard is written to `card.config.json` on your machine
  and **becomes public when you publish**. The wizard says so before the first question.
  Only add details you are comfortable sharing publicly; all fields except your name are
  optional.
- The wizard sends **only the package name** to `registry.npmjs.org` to check whether it
  is available. Use `--offline` to skip this check.
- Publishing is done by your own npm CLI with your own npm account, and only after you
  confirm.
- To remove your data, unpublish or deprecate the package on npm
  (`npm unpublish <name>` within npm's policy limits, otherwise `npm deprecate`) and
  delete the files and any copies (e.g. the generated web page).

## AI assistants (MCP)

- The MCP server only answers questions an assistant sends it, on the user's own machine.
  It has no tracking and stores nothing.
- To look up a card by name, it contacts **only** `registry.npmjs.org`, sending the package
  name, the same request `npx` makes. A card run as `npx <name> --mcp` makes no network
  requests at all.
- It shares only what the card already shows publicly. Card owners can opt out with
  `"mcp": false`.
- Drafted emails are returned to the user as `mailto:` links and are never sent.
- When creating a card, the details you give are used only to build it. `check_name` sends the
  proposed package name to `registry.npmjs.org`; `create_card_project` writes the card only to
  the new, empty folder you confirm on your own computer. Nothing is published for you.

Contact for privacy questions: ae.pasahan@creetivelab.com.

## Web page and curl integrations

The generated `index.html` loads no external resources, sets a restrictive Content
Security Policy and `no-referrer`. The optional site integrations fetch the published
card text from jsDelivr; jsDelivr sees your server's request, not the visitor's.
