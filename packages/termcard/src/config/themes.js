/**
 * Color themes, named after the four seasons and the turns between them.
 *
 * Only the accent changes between themes. Text uses the terminal's own
 * foreground color ("default"), and the grays are mid-tones, so every theme
 * reads well on both dark and light terminal backgrounds. Accents are exact
 * xterm-256 colors, so they look the same in 256-color and true-color terminals.
 */

const neutral = { text: 'default', muted: '#8a8a8a', faint: '#6c6c6c' };

export const themes = {
  thaw: { ...neutral, accent: '#5fafaf' }, //       late winter → spring: meltwater teal
  bloom: { ...neutral, accent: '#87af5f' }, //      spring: fresh leaves
  blossom: { ...neutral, accent: '#d787af' }, //    spring → summer: petals
  solstice: { ...neutral, accent: '#d7af5f' }, //   summer: midday gold (default)
  ember: { ...neutral, accent: '#d7875f' }, //      summer → autumn: last warm light
  harvest: { ...neutral, accent: '#af875f' }, //    autumn: wheat and wood
  frost: { ...neutral, accent: '#87afd7' }, //      autumn → winter: first ice
  midwinter: { ...neutral, accent: '#8787af' }, //  winter: long blue dusk
};

export const THEME_DESCRIPTIONS = {
  thaw: 'late winter → spring, meltwater teal',
  bloom: 'spring, fresh green',
  blossom: 'spring → summer, petal pink',
  solstice: 'summer, midday gold',
  ember: 'summer → autumn, warm copper',
  harvest: 'autumn, wheat brown',
  frost: 'autumn → winter, ice blue',
  midwinter: 'winter, dusk lavender',
};

export const DEFAULT_THEME = 'solstice';
export const THEME_ROLES = ['text', 'muted', 'faint', 'accent'];
