/** Terminal color support detection and hex → ANSI conversion. */

const CUBE = [0, 95, 135, 175, 215, 255];

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a, b) => a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0);

/** Closest xterm-256 palette index for a hex color (6×6×6 cube or grayscale ramp). */
export function hexTo256(hex) {
  const rgb = hexToRgb(hex);
  const nearest = (v) => CUBE.reduce((best, level, i) => (Math.abs(level - v) < Math.abs(CUBE[best] - v) ? i : best), 0);
  const [r, g, b] = rgb.map(nearest);
  const cubeIndex = 16 + 36 * r + 6 * g + b;
  const cubeRgb = [CUBE[r], CUBE[g], CUBE[b]];

  const avg = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const grayStep = Math.max(0, Math.min(23, Math.round((avg - 8) / 10)));
  const grayRgb = Array(3).fill(8 + grayStep * 10);

  return distance(rgb, grayRgb) < distance(rgb, cubeRgb) ? 232 + grayStep : cubeIndex;
}

/**
 * Color depth for a stream: 0 (none), 256, or 16777216 (truecolor).
 * Honors the NO_COLOR (https://no-color.org) and FORCE_COLOR conventions.
 */
export function colorDepth(stream, env = {}) {
  if ('NO_COLOR' in env && env.NO_COLOR !== '') return 0;
  if (env.FORCE_COLOR === '0' || env.FORCE_COLOR === 'false') return 0;
  const forced = env.FORCE_COLOR !== undefined;
  if (!forced && (!stream?.isTTY || env.TERM === 'dumb')) return 0;
  if (/^(truecolor|24bit)$/i.test(env.COLORTERM ?? '')) return 16777216;
  return 256;
}

/** SGR parameters for a foreground hex color at the given depth. */
export function foreground(hex, depth) {
  if (depth >= 16777216) return `38;2;${hexToRgb(hex).join(';')}`;
  return `38;5;${hexTo256(hex)}`;
}
