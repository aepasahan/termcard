/** Runs the card owner's own npm CLI: publishing and removing cards. */

import { spawn } from 'node:child_process';

/**
 * Runs npm with inherited stdio (so login prompts work) and resolves with its exit code.
 * Arguments are fixed by the caller; on Windows npm is a .cmd file and needs a shell to
 * start, so arguments with spaces are quoted.
 */
export function npm(args, { cwd, quiet = false } = {}) {
  const windows = process.platform === 'win32';
  return new Promise((resolve) => {
    const child = windows
      ? spawn(['npm', ...args.map((a) => (/\s/.test(a) ? `"${a}"` : a))].join(' '), { cwd, stdio: quiet ? 'ignore' : 'inherit', shell: true })
      : spawn('npm', args, { cwd, stdio: quiet ? 'ignore' : 'inherit' });
    child.once('error', () => resolve(1));
    child.once('close', (code) => resolve(code ?? 1));
  });
}

/** Logs in to npm if needed. Returns whether the user is logged in. */
export async function ensureNpmLogin({ cwd, run = npm } = {}) {
  if ((await run(['whoami'], { cwd, quiet: true })) === 0) return true;
  return (await run(['login'], { cwd })) === 0;
}

/** Logs in if needed and publishes the card in `cwd`. */
export async function publishPackage(cwd, { run = npm } = {}) {
  if (!(await ensureNpmLogin({ cwd, run }))) return false;
  return (await run(['publish', '--access', 'public'], { cwd })) === 0;
}
