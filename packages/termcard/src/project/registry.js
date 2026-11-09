/** Whether a package name is free on the public npm registry. */

/**
 * Checks the public registry. Only the package name is sent.
 * @returns {Promise<'available'|'taken'|'unknown'>}
 */
export async function checkAvailability(name, fetchImpl = globalThis.fetch) {
  try {
    const res = await fetchImpl(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
      method: 'GET',
      headers: { accept: 'application/vnd.npm.install-v1+json' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 404) return 'available';
    if (res.ok) return 'taken';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
