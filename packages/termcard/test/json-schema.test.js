import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { jsonSchemaText, buildJsonSchema } from '../src/config/json-schema.js';
import { TOP_LEVEL_KEYS } from '../src/config/schema.js';

const read = (path) => JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(buildJsonSchema());

test('the published schema file is up to date (npm run schema)', () => {
  assert.equal(readFileSync(new URL('../schema/card.schema.json', import.meta.url), 'utf8'), jsonSchemaText());
});

test('the schema covers exactly the options the validator accepts', () => {
  assert.deepEqual(Object.keys(buildJsonSchema().properties).sort(), [...TOP_LEVEL_KEYS].sort());
});

test('example configs are valid against the schema', () => {
  for (const path of ['examples/full.json', 'examples/minimal.json']) {
    assert.ok(validate(read(path)), `${path}: ${JSON.stringify(validate.errors)}`);
  }
  assert.ok(validate({ $schema: 'https://termcard.dev/schema.json', name: 'A', language: 'de', card: false, menu: { items: ['link:github', 'exit'] } }));
});

test('the schema rejects what the validator rejects', () => {
  for (const bad of [{}, { name: 'A', unknown: 1 }, { name: 'A', theme: 'ocean' }, { name: 'A', website: 'ftp://x.org' },
    { name: 'A', email: 'a?b@x.com' }, { name: 'A', icons: 'fancy' }, { name: 'A', menu: { items: [] } }, { name: 'x'.repeat(81) }]) {
    assert.equal(validate(bad), false, JSON.stringify(bad));
  }
});
