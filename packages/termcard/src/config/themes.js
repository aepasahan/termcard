/**
 * Color themes. Colors are hex values; renderers convert them to the closest
 * xterm-256 color (or use 24-bit color where the terminal supports it).
 */

const base = { text: '#eeeeee', muted: '#8a8a8a', faint: '#585858' };

export const themes = {
  gold: { ...base, accent: '#d7af5f' },
  ocean: { ...base, accent: '#5fafd7' },
  sage: { ...base, accent: '#87af87' },
  rose: { ...base, accent: '#d78787' },
  violet: { ...base, accent: '#af87ff' },
  mono: { ...base, accent: '#bcbcbc' },
};

export const DEFAULT_THEME = 'gold';
export const THEME_ROLES = ['text', 'muted', 'faint', 'accent'];
