/**
 * The only module that touches the operating system.
 * Commands are spawned without a shell and with fixed argument lists, so no
 * value from a config can be interpreted as a shell command.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

const SAFE_URL = /^(https?:\/\/|mailto:|tel:)/i;
// Openers normally exit within milliseconds; one still running after this is treated as success.
const OPENER_GRACE_MS = 1500;

function openerFor(platform) {
  if (platform === 'darwin') return ['open', []];
  if (platform === 'win32') return ['rundll32', ['url.dll,FileProtocolHandler']];
  return ['xdg-open', []];
}

/** Opens a URL (http, https, mailto, tel) or an absolute file path with the default app. */
export function openExternal(target, platform = process.platform) {
  if (!SAFE_URL.test(target) && !isAbsolute(target)) return Promise.resolve(false);
  const [command, args] = openerFor(platform);
  return new Promise((resolve) => {
    const child = spawn(command, [...args, target], { stdio: 'ignore', detached: true, shell: false });
    const timer = setTimeout(() => {
      child.unref();
      resolve(true);
    }, OPENER_GRACE_MS);
    timer.unref();
    child.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

function clipboardTools(platform) {
  if (platform === 'darwin') return [['pbcopy', []]];
  if (platform === 'win32') return [['clip', []]];
  return [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]];
}

/** Copies text using the platform clipboard tool. Resolves false if none is available. */
export function copyToClipboard(text, platform = process.platform) {
  const tools = clipboardTools(platform);
  return new Promise((resolve) => {
    const attempt = (i) => {
      if (i >= tools.length) return resolve(false);
      const [command, args] = tools[i];
      const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'ignore'], shell: false });
      child.once('error', () => attempt(i + 1));
      child.once('close', (code) => (code === 0 ? resolve(true) : attempt(i + 1)));
      child.stdin.on('error', () => {});
      child.stdin.end(text);
    };
    attempt(0);
  });
}

/** Writes a file into a fresh private temp directory (mode 0600) and returns its path. */
export function writeTempFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'termcard-'));
  const file = join(dir, name);
  writeFileSync(file, content, { mode: 0o600 });
  return file;
}
