# termcard

Interactive business cards for the terminal.

```bash
npm create termcard@latest
```

Answer a few questions, preview your card, publish — and anyone can meet you with:

```bash
npx yourname
```

```
  ╭──────────────────────────────────────────────────────╮
  │                                                      │
  │    J A N E                                           │
  │    D O E                                             │
  │    Product Designer                                  │
  │                                                      │
  │    @studio                                           │
  │    ───                                               │
  │                                                      │
  │    Web       jane.example.com                        │
  │    Email     jane@example.com                        │
  │    LinkedIn  linkedin.com/in/janedoe                 │
  │    GitHub    github.com/janedoe                      │
  │                                                      │
  │                                  Berlin · Germany    │
  │                                                      │
  ╰──────────────────────────────────────────────────────╯

  › Get in touch
    Save contact
    Visit website
    View LinkedIn profile
    View GitHub profile
    Copy email address
    Language
    Exit
```

## Features

- **One command** from nothing to a published card, with an npm name check.
- **Interactive menu** — email draft, add to contacts (vCard), open profiles, copy details.
- **Multilingual** — English, Turkish, German, Spanish and French built in; detects the
  visitor's system language and lets them switch from the menu. Add your own languages.
- **Fully customizable** — three templates, six color themes or your own colors, border
  and name styles, which fields to show, menu items and their order, every text.
- **Beyond the terminal** — a web version, vCards and drop-in code so `curl yourdomain.com`
  prints your card.
- **Zero dependencies, no tracking** — nothing is collected about the people who run your
  card. See [PRIVACY.md](PRIVACY.md).

## Customizing

Your card is one JSON file. A minimal one:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "links": ["https://github.com/janedoe"]
}
```

Everything else — templates, colors, fields, menu, languages — is described in the
[configuration reference](docs/configuration.md). [`examples/full.json`](examples/full.json)
uses every option.

```bash
npx termcard preview      # try it
npx termcard validate     # check for mistakes
npx termcard build        # web page, vCards, curl files
```

## Packages

| Package | |
| ------- | --- |
| [`termcard`](packages/termcard) | Renders and runs cards. Every card package depends on it. |
| [`create-termcard`](packages/create-termcard) | The setup wizard behind `npm create termcard`. |

Requires Node.js 18.18 or later. Works on macOS, Linux and Windows.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).
