/** "theme": a seasonal preset, optionally with own colors and a solid or gradient card background. */

import { isObject, HEX } from '../checker.js';
import { themes, DEFAULT_THEME, THEME_ROLES } from '../themes.js';

const isLight = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
};

export function normalizeTheme(c, raw) {
  if (raw === undefined) return { ...themes[DEFAULT_THEME] };
  const value = typeof raw === 'string' ? { preset: raw } : raw;
  if (!isObject(value)) return c.fail('theme', 'must be a preset name or an object'), { ...themes[DEFAULT_THEME] };
  c.unknownKeys('theme', value, ['preset', ...THEME_ROLES]);
  const preset = c.oneOf('theme.preset', value.preset, Object.keys(themes), DEFAULT_THEME);
  const theme = { ...themes[preset] };
  for (const role of THEME_ROLES) {
    if (value[role] === undefined) continue;
    if (role === 'background' && Array.isArray(value.background)) {
      if (value.background.length === 2 && value.background.every((v) => typeof v === 'string' && HEX.test(v))) theme.background = value.background.map((v) => v.toLowerCase());
      else c.fail('theme.background', 'must be a hex color, "default", or two hex colors for a gradient, e.g. ["#1d2433", "#3a1d33"]');
      continue;
    }
    if (typeof value[role] === 'string' && HEX.test(value[role])) theme[role] = value[role].toLowerCase();
    else if (value[role] === 'default') theme[role] = 'default';
    else c.fail(`theme.${role}`, 'must be a hex color like "#d7af5f" or "default" (the terminal\'s own color)');
  }
  // On a card background of its own, the terminal's text color may not be readable: pick one.
  if (theme.background !== 'default' && theme.text === 'default') {
    const stops = [theme.background].flat();
    theme.text = stops.filter(isLight).length * 2 >= stops.length ? '#1c1c1c' : '#eeeeee';
  }
  return theme;
}
