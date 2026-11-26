/**
 * The sample card behind `npx termcard demo`: John Doe, with example.com details, so anyone can
 * try Termcard without publishing anything.
 */
export const DEMO_CARD = {
  name: 'John Doe',
  title: { en: 'Product designer', tr: 'Ürün tasarımcısı', de: 'Produktdesigner', es: 'Diseñador de producto', fr: 'Designer produit', ja: 'プロダクトデザイナー' },
  tagline: 'Calm software, clear systems',
  email: 'john@example.com',
  website: 'https://example.com',
  location: { en: 'New York · United States', tr: 'New York · ABD', de: 'New York · USA', es: 'Nueva York · Estados Unidos', fr: 'New York · États-Unis', ja: 'ニューヨーク · アメリカ' },
  language: { available: ['en', 'tr', 'de', 'es', 'fr', 'ja'] },
  theme: 'frost',
  icons: 'symbols',
  mcp: false,
};
