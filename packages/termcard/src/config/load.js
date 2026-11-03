import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeConfig, ConfigError } from './schema.js';

const MAX_CONFIG_BYTES = 64 * 1024;

/**
 * Reads and validates a JSON config file. Only JSON is accepted on purpose:
 * a config can never execute code.
 */
export function loadConfig(file) {
  const path = file instanceof URL ? fileURLToPath(file) : file;
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    throw new ConfigError([`cannot read ${path} (${error.code ?? error.message})`]);
  }
  if (Buffer.byteLength(source) > MAX_CONFIG_BYTES) throw new ConfigError([`${path} is larger than 64 KB`]);
  let raw;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    throw new ConfigError([`${path} is not valid JSON (${error.message})`]);
  }
  return normalizeConfig(raw);
}
