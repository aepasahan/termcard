# termcard

Renders and runs interactive terminal business cards. You usually don't install this
directly — start with:

```bash
npm create termcard@latest
```

## Using it in your own package

```js
#!/usr/bin/env node
import { start } from 'termcard';

await start(new URL('../card.config.json', import.meta.url));
```

## CLI

```bash
termcard preview [config]   # show the card
termcard validate [config]  # check the config
termcard build [config]     # web page, vCards and curl files in dist/
```

Configuration: <https://github.com/aepasahan/termcard/blob/main/docs/configuration.md>
