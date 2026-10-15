import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished } from '../scripts/search.mjs';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const messages = read('content/messages/fr.json');
const { reading } = loadReadingInputs('fr');

test('French publication requires complete reading and all 291 keys with exact placeholder parity', () => {
  assert.deepEqual(validateMessages(messages), []);
  assert.deepEqual(validateReading(loadReadingInputs('fr')), []);
  assert.equal(Object.keys(messages).length, 291);
  const neutral = new Set(['app.magnifica_humanitas', 'app.atlas', 'concept.value_magnifica_humanitas', 'block.description', 'source.page', 'source.pages', 'route.concept', 'note.source_value']);
  for (const [key, text] of Object.entries(messages)) if (!neutral.has(key)) assert.notEqual(text, english[key], key);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es', 'fr', 'pt']);
  for (const l of localeRegistry.filter(l => !['en', 'it', 'de', 'es', 'fr', 'pt'].includes(l.id))) assert.equal(l.reviewed, false);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /en français/);
  const evidence = read('content/editorial/fr/interface-review.json');
  assert.equal(evidence.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/fr.json', import.meta.url))).digest('hex'));
  assert.equal(evidence.readingRevision, reading.revision);
});

test('French relation labels, saved labels, dynamic notices and numeric formatting match the edition', () => {
  for (const r of read('content/editorial/fr/alignment-review.json').relationLabels) assert.equal(messages[`relation.${r.type}`], r.label);
  assert.equal(formatDisposition('retain', messages), 'conserver');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'fr', messages), 'Dignité humaine · Raisonnement 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Dignité humaine' }), 'Retour à Dignité humaine.');
  assert.equal(new Intl.NumberFormat('fr').format(24500), '24\u202f500');
});

test('French search handles accents, case and the localized paragraphe keyword', () => {
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'fr', messages });
  assert.equal(search('EDUCATION')[0].id, 'concept-education');
  assert.equal(search('DIGNITE HUMAINE')[0].id, 'concept-dignity');
  for (const query of ['PARAGRAPHE 52', 'paragraphe 52', '§52', 'p052']) {
    const result = search(query);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'Paragraphe adapté');
    assert.equal(result[0].to, '/fr/read?at=read-p052');
  }
  assert.ok(search('justice').every(r => r.to.startsWith('/fr/')));
  assert.deepEqual(search('zzzzsansresultat'), []);
});

test('French defaults use ordered regional preferences and explicit available URLs', () => {
  assert.equal(resolveBrowserLocale({ languages: ['pl-PL', 'FR-ca', 'it'] }), 'fr');
  assert.equal(resolveBrowserLocale({ languages: ['it-IT', 'fr-FR'] }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['de-AT', 'fr-CH'] }), 'de');
  assert.equal(resolveBrowserLocale({ languages: ['es-MX', 'fr-BE'] }), 'es');
  assert.equal(resolveBrowserLocale({ languages: ['en-GB', 'fr-FR'] }), 'en');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'fr-CA' }), 'fr');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'pl' }), 'en');
  for (const route of ['/en/source/p052', '/it/notes/n143', '/de/concepts/dignity', '/es/about']) assert.equal(resolveLocaleRoute(route, { languages: ['fr'] }), route);
  assert.equal(resolveLocaleRoute('/search?q=%C3%A9ducation#concept', { languages: ['fr-FR'] }), '/fr/search?q=%C3%A9ducation#concept');
});
