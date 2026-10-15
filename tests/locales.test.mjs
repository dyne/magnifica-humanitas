import test from 'node:test';
import assert from 'node:assert/strict';
import { availableLocales, localeRegistry, primaryLanguage, resolveBrowserLocale, resolveLocaleRoute, equivalentLocaleRoute } from '../scripts/locales.mjs';

// Availability injection exercises future editions without publishing fake prose.
const fixture = ['en', 'ar', 'pt', 'de'].map(id => ({ id }));

test('only complete reviewed editions ship; official source files alone do not enable a locale', () => {
  assert.deepEqual(availableLocales.map(locale => locale.id), ['en', 'it', 'de', 'es', 'fr', 'pt']);
  assert.equal(localeRegistry.length, 10);
  for (const locale of availableLocales) assert.ok(locale.source && locale.reading && locale.messages && locale.reviewed);
  assert.ok(Object.isFrozen(localeRegistry[0]));
});

test('browser preferences use ordered supported primary languages and then navigator.language', () => {
  for (const [preferences, expected] of [
    [{ languages: ['fr', 'pt-BR', 'ar'], language: 'de' }, 'pt'],
    [{ languages: ['AR-eg', 'de-DE'] }, 'ar'],
    [{ languages: ['DE-latn-DE', 'pt'] }, 'de'],
    [{ languages: ['zh-Hant', 'xx'], language: 'pT-PT' }, 'pt'],
    [{ languages: [], language: 'AR' }, 'ar'],
    [{ language: 'de' }, 'de'],
    [{ languages: null, language: 'pt' }, 'pt'],
    [{ languages: ['pt_BR', '', null, 42, ' ar ', 'en--US'], language: 'ar' }, 'ar'],
    [{ languages: ['fr', ''], language: 'zz' }, 'en'],
    [{}, 'en'],
  ]) assert.equal(resolveBrowserLocale(preferences, fixture), expected);
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'it-IT'] }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['IT-ch', 'en-US'] }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['en-US', 'it-IT'] }), 'en');
  assert.equal(resolveBrowserLocale({ languages: ['fr', 'ar'] }), 'fr');
  assert.equal(resolveLocaleRoute('/en/read', { languages: ['it-IT'] }), '/en/read');
  assert.equal(resolveLocaleRoute('/it/read?at=read-p052', { languages: ['en'] }), '/it/read?at=read-p052');
  for (const malformed of ['', ' en', 'en ', 'en_US', 'en--US', '/', undefined, 10]) assert.equal(primaryLanguage(malformed), undefined);
});

test('explicit available routes win, unsupported locales fall back and IDs remain intact', () => {
  const browser = { languages: ['ar'] };
  for (const [path, expected] of [
    ['/', '/ar/atlas'],
    ['/?q=peace#paragraph', '/ar/atlas?q=peace#paragraph'],
    ['/search?q=care%20work', '/ar/search?q=care%20work'],
    ['/en/atlas', '/en/atlas'],
    ['/ar/source/p052?at=block-1#note', '/ar/source/p052?at=block-1#note'],
    ['/AR/concepts/missing-id', '/ar/concepts/missing-id'],
    ['/xx/concepts/missing-id?q=x#anchor', '/en/concepts/missing-id?q=x#anchor'],
    ['/it/read', '/en/read'],
    ['/en/concepts/missing-id', '/en/concepts/missing-id'],
  ]) assert.equal(resolveLocaleRoute(path, browser, fixture), expected);
  assert.equal(resolveLocaleRoute('/ar/source/p052', browser), '/en/source/p052');
});

test('equivalent routes preserve stable IDs, queries and anchors without caller labels', () => {
  assert.equal(equivalentLocaleRoute('/en/trails/technology/steps/decision?at=x%2Fy#block', 'ar'), '/ar/trails/technology/steps/decision?at=x%2Fy#block');
  assert.equal(equivalentLocaleRoute('/pt/notes/n219', 'en'), '/en/notes/n219');
  assert.throws(() => equivalentLocaleRoute('/en/read', '../ar'));
});
