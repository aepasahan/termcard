#!/usr/bin/env node
// Writes schema/card.schema.json from the validator's rules: npm run schema
import { writeFileSync } from 'node:fs';
import { jsonSchemaText } from '../src/config/json-schema.js';

writeFileSync(new URL('../schema/card.schema.json', import.meta.url), jsonSchemaText());
console.log('✓ schema/card.schema.json');
