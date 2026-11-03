# create-termcard

Create and publish your terminal business card:

```bash
npm create termcard@latest
```

The wizard asks for your details, shows a live preview, checks that the package name is
free on npm and can publish it for you. Afterwards anyone can run `npx <your-name>`.

For scripts and CI:

```bash
npm create termcard@latest my-card -- --config card.config.json --name my-card
```

Run with `--help` for all options. Documentation:
<https://github.com/aepasahan/termcard>
