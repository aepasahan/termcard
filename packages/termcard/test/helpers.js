import { normalizeConfig } from '../src/index.js';

export const base = {
  name: 'Jane Doe',
  title: { en: 'Designer', tr: 'Tasarımcı' },
  tagline: '@studio',
  email: 'jane@example.com',
  website: 'https://jane.dev',
  location: { en: 'Berlin · Germany', tr: 'Berlin · Almanya' },
  links: ['https://github.com/jane', 'https://www.linkedin.com/in/jane'],
  language: { available: ['en', 'tr'] },
};

export const make = (overrides = {}) => normalizeConfig({ ...base, ...overrides });

/** A writable stream stand-in that records output. */
export function sink({ isTTY = false } = {}) {
  return { isTTY, output: '', write(chunk) { this.output += chunk; return true; } };
}
