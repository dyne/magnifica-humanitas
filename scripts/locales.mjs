// Source acquisition alone never makes an edition available to readers.
const pending = { source: true, reading: false, messages: false, reviewed: false };
export const localeRegistry = Object.freeze([
  { id: 'en', autonym: 'English', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'it', autonym: 'Italiano', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'de', autonym: 'Deutsch', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'es', autonym: 'Español', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'fr', autonym: 'Français', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'pt', autonym: 'Português', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'pl', autonym: 'Polski', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'be', autonym: 'Беларуская', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  { id: 'ru', autonym: 'Русский', dir: 'ltr', source: true, reading: true, messages: true, reviewed: true },
  ...[['ar', 'العربية']]
    .map(([id, autonym]) => ({ id, autonym, dir: id === 'ar' ? 'rtl' : 'ltr', ...pending })),
].map(Object.freeze));

export const availableLocales = localeRegistry.filter(locale => locale.source && locale.reading && locale.messages && locale.reviewed);

export function primaryLanguage(value) {
  if (typeof value !== 'string' || !value || value !== value.trim()) return undefined;
  try { return new Intl.Locale(value).language.toLowerCase(); } catch { return undefined; }
}

// Preferences are read afresh on every neutral entry; there is no saved override.
export function resolveBrowserLocale(preferences = {}, available = availableLocales) {
  const ids = new Set(available.map(locale => locale.id));
  const ordered = Array.isArray(preferences.languages) ? preferences.languages : [];
  for (const value of [...ordered, preferences.language]) {
    const primary = primaryLanguage(value);
    if (ids.has(primary)) return primary;
  }
  return 'en';
}

const surfaces = new Set(['atlas', 'about', 'concepts', 'relations', 'foundations', 'source', 'notes', 'trails', 'read', 'search', 'saved']);

export function routeLocale(path) {
  const first = path.split(/[/?#]/)[1];
  return first && !surfaces.has(first) ? primaryLanguage(first) : undefined;
}

// Accept a hash-router path, retaining encoded identities, query and anchor bytes.
// Caller labels are deliberately not carried: they belong to the old edition.
export function equivalentLocaleRoute(fullPath, locale) {
  const normalized = primaryLanguage(locale);
  if (!normalized) throw new Error('Invalid destination locale');
  const path = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
  const first = path.split(/[/?#]/)[1];
  const tail = first && !surfaces.has(first) ? path.slice(first.length + 1) : path;
  const destination = !tail || /^\/(?:[?#]|$)/.test(tail) ? `/atlas${tail.slice(1)}` : tail;
  return `/${normalized}${destination}`;
}

export function resolveLocaleRoute(fullPath, preferences = {}, available = availableLocales) {
  const explicit = routeLocale(fullPath);
  const first = fullPath.split(/[/?#]/)[1];
  const hasPrefix = !!first && !surfaces.has(first);
  const locale = hasPrefix
    ? (available.some(entry => entry.id === explicit) ? explicit : 'en')
    : resolveBrowserLocale(preferences, available);
  return equivalentLocaleRoute(fullPath, locale);
}
