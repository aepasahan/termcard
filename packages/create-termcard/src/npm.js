/** Publishing with the user's own npm CLI. */

import { spawn } from 'node:child_process';

/**
 * Runs npm with inherited stdio (so login prompts work). Arguments are fixed
 * by the caller; on Windows npm is a .cmd file and needs a shell to start.
 */
export function npm(args, { cwd, quiet = false } = {}) {
  const windows = process.platform === 'win32';
  return new Promise((resolve) => {
    // On Windows the arguments are fixed literals joined into one command line.
    const child = windows
      ? spawn(['npm', ...args].join(' '), { cwd, stdio: quiet ? 'ignore' : 'inherit', shell: true })
      : spawn('npm', args, { cwd, stdio: quiet ? 'ignore' : 'inherit' });
    child.once('error', () => resolve(1));
    child.once('close', (code) => resolve(code ?? 1));
  });
}

/** Logs in if needed and publishes. */
export async function publish(cwd) {
  if ((await npm(['whoami'], { cwd, quiet: true })) !== 0) {
    if ((await npm(['login'], { cwd })) !== 0) return false;
  }
  return (await npm(['publish', '--access', 'public'], { cwd })) === 0;
}
