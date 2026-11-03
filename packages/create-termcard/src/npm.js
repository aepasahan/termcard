/** Talking to npm: name availability and publishing. */

import { spawn } from 'node:child_process';

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

/**
 * Runs npm with inherited stdio (so login prompts work). Arguments are fixed
 * by the caller; on Windows npm is a .cmd file and needs a shell to start.
 */
export function npm(args, { cwd, quiet = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
      cwd,
      stdio: quiet ? 'ignore' : 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', () => resolve(1));
    child.once('close', (code) => resolve(code ?? 1));
  });
}

export async function publish(cwd) {
  if ((await npm(['whoami'], { cwd, quiet: true })) !== 0) {
    if ((await npm(['login'], { cwd })) !== 0) return false;
  }
  return (await npm(['publish', '--access', 'public'], { cwd })) === 0;
}
