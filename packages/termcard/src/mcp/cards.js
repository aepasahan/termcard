/**
 * Where the MCP server gets cards from:
 * - the card it was started with (`npx <card> --mcp`), read locally, no network;
 * - any other termcard card on npm, looked up by package name.
 *
 * Remote cards come only from the npm registry: the published tarball is downloaded, checked
 * against npm's integrity hash, and card.config.json is read from it. They are untrusted input:
 * the package must depend on termcard, sizes are limited, and the config goes through the same
 * validation and sanitizing as every card.
 */

import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { normalizeConfig, ConfigError } from '../config/schema.js';
import { ToolError } from './protocol.js';

const REGISTRY = 'https://registry.npmjs.org';
const MAX_BYTES = 64 * 1024; // card.config.json and registry metadata
const MAX_TARBALL = 1024 * 1024; // a card package is a few kilobytes
const TIMEOUT_MS = 8000;
const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

async function download(fetchImpl, url, limit) {
  let res;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ToolError('Could not reach npm. Check the internet connection and try again.');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ToolError(`npm responded with ${res.status}. Try again later.`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > limit) throw new ToolError('The response from npm was unexpectedly large.');
  return bytes;
}

/** Reads one file from a .tgz (ustar) archive. */
export function readFromTarball(gzipped, wanted) {
  const tar = gunzipSync(gzipped, { maxOutputLength: MAX_TARBALL * 4 });
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const field = (start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
    const name = [field(345, 155), field(0, 100)].filter(Boolean).join('/');
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const body = offset + 512;
    if (name === wanted && (header[156] === 0 || header[156] === 48)) return tar.subarray(body, body + size);
    offset = body + Math.ceil(size / 512) * 512;
  }
  return null;
}

/** Verifies a download against npm's Subresource Integrity string (e.g. "sha512-…"). */
function verifyIntegrity(bytes, integrity) {
  const [algorithm, expected] = String(integrity ?? '').split('-');
  if (!['sha512', 'sha384', 'sha256'].includes(algorithm) || !expected) return false;
  return createHash(algorithm).update(bytes).digest('base64') === expected;
}

/** Loads and validates a published card. Returns { config, packageName, version }. */
export async function fetchCard(packageName, fetchImpl = globalThis.fetch) {
  if (typeof packageName !== 'string' || packageName.length > 214 || !PACKAGE_NAME.test(packageName)) {
    throw new ToolError(`"${String(packageName).slice(0, 80)}" is not a valid npm package name.`);
  }
  const meta = await download(fetchImpl, `${REGISTRY}/${packageName.replace('/', '%2f')}/latest`, MAX_BYTES * 4);
  if (meta === null) throw new ToolError(`There is no npm package called "${packageName}".`);
  const pkg = JSON.parse(meta.toString('utf8'));
  if (!pkg.dependencies?.termcard) throw new ToolError(`"${packageName}" is not a Termcard business card.`);

  const tarballUrl = pkg.dist?.tarball;
  if (typeof tarballUrl !== 'string' || !tarballUrl.startsWith(`${REGISTRY}/`)) {
    throw new ToolError(`"${packageName}" has no downloadable package on npm.`);
  }
  const tarball = await download(fetchImpl, tarballUrl, MAX_TARBALL);
  if (!tarball || !verifyIntegrity(tarball, pkg.dist.integrity)) {
    throw new ToolError(`The package "${packageName}" could not be verified.`);
  }
  const source = readFromTarball(tarball, 'package/card.config.json');
  if (!source || source.length > MAX_BYTES) {
    throw new ToolError(`"${packageName}" does not include a readable card.config.json.`);
  }
  try {
    return { config: normalizeConfig(JSON.parse(source.toString('utf8'))), packageName, version: pkg.version };
  } catch (error) {
    if (error instanceof ConfigError || error instanceof SyntaxError) {
      throw new ToolError(`The card "${packageName}" has an invalid configuration.`);
    }
    throw error;
  }
}

/**
 * @param {{ pinned?: { config, packageName }, fetch?: typeof fetch }} options
 * @returns {(name?: string) => Promise<{ config, packageName }>}
 */
// Looked-up cards are kept briefly, so updates to a card show up and memory stays bounded
// on a long-running (remote) server.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;

export function createCardSource({ pinned, fetch: fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const cache = new Map(); // name → { card: Promise, expires }
  const cached = (wanted) => {
    const entry = cache.get(wanted);
    if (entry && entry.expires > now()) return entry.card;
    cache.delete(wanted);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // oldest first
    const card = fetchCard(wanted, fetchImpl).catch((e) => (cache.delete(wanted), Promise.reject(e)));
    cache.set(wanted, { card, expires: now() + CACHE_TTL_MS });
    return card;
  };
  return async (name) => {
    const wanted = typeof name === 'string' ? name.trim().toLowerCase().replace(/^npx\s+/, '') : '';
    let card;
    if (!wanted || wanted === pinned?.packageName) {
      if (!pinned) throw new ToolError('Please provide the card\'s npm package name, e.g. "aepasahan" for `npx aepasahan`.');
      card = pinned;
    } else {
      card = await cached(wanted);
    }
    if (card.config.mcp === false) {
      throw new ToolError(`The owner of "${card.packageName}" has chosen not to share this card with AI assistants. It can still be opened in a terminal: npx ${card.packageName}`);
    }
    return card;
  };
}
