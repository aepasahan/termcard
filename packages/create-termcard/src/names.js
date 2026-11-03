/** Package name helpers (npm naming rules) and name → slug conversion. */

const SPECIAL = { ı: 'i', ß: 'ss', ø: 'o', æ: 'ae', œ: 'oe', ł: 'l', đ: 'd', þ: 'th' };

/** "Ahmet Erkan Paşahan" → "ahmet-erkan-pasahan" */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[ıßøæœłđþ]/g, (ch) => SPECIAL[ch])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/** Returns an error message, or undefined if the name is a valid new npm package name. */
export function validatePackageName(name) {
  if (!name) return 'A package name is required';
  if (name.length > 214) return 'Must be at most 214 characters';
  if (name !== name.toLowerCase()) return 'Must be lowercase';
  if (/^[._]/.test(name)) return 'Cannot start with . or _';
  if (name.trim() !== name) return 'Cannot contain spaces';
  const match = /^(?:@([a-z0-9-~][a-z0-9-._~]*)\/)?([a-z0-9-~][a-z0-9-._~]*)$/.exec(name);
  if (!match) return 'May only contain lowercase letters, digits, - . _ ~ (optionally @scope/name)';
  if (['node_modules', 'favicon.ico'].includes(match[2])) return 'This name is reserved';
  return undefined;
}

/** Command name users type after npx: the part after the scope. */
export const binName = (pkg) => pkg.split('/').pop();
