import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished } from '../scripts/search.mjs';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const messages = read('content/messages/es.json');
const { reading } = loadReadingInputs('es');

test('Spanish publication requires complete reading and all 291 keys with exact placeholder parity', () => {
  assert.deepEqual(validateMessages(messages), []);
  assert.deepEqual(validateReading(loadReadingInputs('es')), []);
  assert.equal(Object.keys(messages).length, 291);
  const neutral = new Set(['app.magnifica_humanitas', 'app.atlas', 'concept.value_magnifica_humanitas', 'block.description']);
  for (const [key, text] of Object.entries(messages)) if (!neutral.has(key)) assert.notEqual(text, english[key], key);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es', 'fr', 'pt', 'pl', 'be', 'ru', 'ar']);
  for (const l of localeRegistry.filter(l => !['en', 'it', 'de', 'es', 'fr', 'pt', 'pl', 'be', 'ru', 'ar'].includes(l.id))) assert.equal(l.reviewed, false);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /en español/);
  const evidence = read('content/editorial/es/interface-review.json');
  assert.equal(evidence.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/es.json', import.meta.url))).digest('hex'));
  assert.equal(evidence.readingRevision, reading.revision);
});

test('Spanish relation labels, saved labels, dynamic notices and numeric formatting match the edition', () => {
  for (const r of read('content/editorial/es/alignment-review.json').relationLabels) assert.equal(messages[`relation.${r.type}`], r.label);
  assert.equal(formatDisposition('retain', messages), 'conservar');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'es', messages), 'Dignidad humana · Razonamiento 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Dignidad humana' }), 'Has vuelto a Dignidad humana.');
  assert.equal(new Intl.NumberFormat('es').format(24500), '24.500');
});

test('Spanish search handles accents, case and the localized párrafo keyword', () => {
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'es', messages });
  assert.equal(search('EDUCACION')[0].id, 'concept-education');
  assert.equal(search('DIGNIDAD HUMANA')[0].id, 'concept-dignity');
  for (const query of ['PÁRRAFO 52', 'parrafo 52', '§52', 'p052']) {
    const result = search(query);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'Párrafo adaptado');
    assert.equal(result[0].to, '/es/read?at=read-p052');
  }
  assert.ok(search('justicia').every(r => r.to.startsWith('/es/')));
  assert.deepEqual(search('zzzzsinresultado'), []);
});

test('Spanish defaults respect ordered regional preferences, fallback and explicit existing editions', () => {
  assert.equal(resolveBrowserLocale({ languages: ['zh-CN', 'ES-mx', 'it'] }), 'es');
  assert.equal(resolveBrowserLocale({ languages: ['it-IT', 'es-ES'] }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['de-AT', 'es-AR'] }), 'de');
  assert.equal(resolveBrowserLocale({ languages: ['en-GB', 'es-ES'] }), 'en');
  assert.equal(resolveBrowserLocale({ languages: ['ja', 'zh'], language: 'es-CO' }), 'es');
  assert.equal(resolveBrowserLocale({ languages: ['ja', 'zh'], language: 'ja' }), 'en');
  for (const route of ['/en/source/p052', '/it/notes/n143', '/de/concepts/dignity']) assert.equal(resolveLocaleRoute(route, { languages: ['es'] }), route);
  assert.equal(resolveLocaleRoute('/search?q=educaci%C3%B3n#concepto', { languages: ['es-ES'] }), '/es/search?q=educaci%C3%B3n#concepto');
});
