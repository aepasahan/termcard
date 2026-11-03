/**
 * Icon sets for card rows and menu entries.
 *
 * - symbols: plain Unicode symbols that every terminal font has (default choice when icons are on)
 * - emoji:   colorful, two columns wide; looks best on macOS and modern terminals
 * - nerd:    brand icons; requires a Nerd Font (https://www.nerdfonts.com) in the visitor's
 *            terminal, so it suits developer audiences. Web output falls back to symbols.
 */

const sets = {
  symbols: {
    website: '⌂', email: '✉', phone: '☎', location: '◎', link: '↗',
    save: '+', language: '⇄', exit: '×',
  },
  emoji: {
    website: '🌐', email: '📧', phone: '📞', location: '📍', link: '🔗',
    save: '📇', language: '💬', exit: '👋',
  },
  nerd: {
    website: '', email: '', phone: '', location: '', link: '',
    save: '', language: '', exit: '',
    github: '', gitlab: '', linkedin: '', x: '', instagram: '',
    facebook: '', youtube: '', behance: '', dribbble: '', medium: '',
    stackoverflow: '', codepen: '', npm: '',
  },
};

/**
 * Returns the icon for a key ("email", "website", …) or a link, or '' when icons are off.
 * A link's own `icon` always wins.
 */
export function iconFor(set, key, link) {
  if (link?.icon) return link.icon;
  if (!sets[set]) return '';
  if (link) return sets[set][link.service] ?? sets[set].link;
  return sets[set][key] ?? '';
}

/** Icon set to use in HTML: Nerd Font glyphs are not available on the web. */
export const webIconSet = (set) => (set === 'nerd' ? 'symbols' : set);
