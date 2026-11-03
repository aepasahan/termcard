/**
 * Templates are presets for the `card` section. Every option can still be
 * overridden individually in the config.
 */

export const templates = {
  // Business-card look: letter-spaced name, generous whitespace.
  classic: {
    border: 'rounded',
    nameStyle: 'spaced',
    splitName: true,
    spacing: 'relaxed',
    accentRule: true,
    labels: true,
    locationAlign: 'right',
    padding: 4,
    width: 56,
  },
  // Denser layout for longer names or smaller terminals.
  compact: {
    border: 'rounded',
    nameStyle: 'plain',
    splitName: false,
    spacing: 'compact',
    accentRule: false,
    labels: true,
    locationAlign: 'left',
    padding: 2,
    width: 'auto',
  },
  // No frame, no labels — just the essentials.
  minimal: {
    border: 'none',
    nameStyle: 'plain',
    splitName: false,
    spacing: 'compact',
    accentRule: false,
    labels: false,
    locationAlign: 'left',
    padding: 0,
    width: 'auto',
  },
};

export const DEFAULT_TEMPLATE = 'classic';

export const CARD_OPTIONS = {
  border: ['rounded', 'square', 'double', 'heavy', 'none'],
  nameStyle: ['spaced', 'uppercase', 'plain'],
  spacing: ['relaxed', 'compact'],
  locationAlign: ['left', 'right'],
};

/** Default menu: every action that has the data it needs is shown, in this order. */
export const DEFAULT_MENU = ['contact', 'save', 'website', 'links', 'copy-email', 'language', 'exit'];
export const MENU_ACTIONS = ['contact', 'save', 'website', 'links', 'copy-email', 'copy-phone', 'language', 'exit'];
