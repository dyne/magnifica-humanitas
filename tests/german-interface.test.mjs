import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished } from '../scripts/search.mjs';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const messages = read('content/messages/de.json');
const { reading } = loadReadingInputs('de');

test('German publication requires complete reading and all 291 catalog keys with exact placeholder parity', () => {
  assert.deepEqual(validateMessages(messages), []);
  assert.deepEqual(validateReading(loadReadingInputs('de')), []);
  assert.equal(Object.keys(messages).length, 291);
  const neutral = new Set(['app.magnifica_humanitas', 'concept.value_magnifica_humanitas', 'block.description']);
  for (const [key, text] of Object.entries(messages)) if (!neutral.has(key)) assert.notEqual(text, english[key], key);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es', 'fr']);
  for (const l of localeRegistry.filter(l => !['en', 'it', 'de', 'es', 'fr'].includes(l.id))) assert.equal(l.reviewed, false);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /auf Deutsch/);
  const evidence = read('content/editorial/de/interface-review.json');
  assert.equal(evidence.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/de.json', import.meta.url))).digest('hex'));
  assert.equal(evidence.readingRevision, 'de-2026-10-15-reading-2');
});

test('German interface uses exact reviewed relation labels, readable saved labels and locale formatting', () => {
  for (const r of read('content/editorial/de/alignment-review.json').relationLabels) assert.equal(messages[`relation.${r.type}`], r.label);
  assert.equal(formatDisposition('retain', messages), 'bewahren');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'de', messages), 'Menschenwürde · Argumentation 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Menschenwürde' }), 'Zurück zu Menschenwürde.');
  assert.equal(new Intl.NumberFormat('de').format(24500), '24.500');
});

test('German search handles umlauts, accent folding, case and the localized Absatz keyword', () => {
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'de', messages });
  assert.equal(search('WÜRDE')[0].id, 'concept-dignity');
  assert.equal(search('subsidiaritat')[0].id, 'concept-subsidiarity');
  for (const query of ['Absatz 52', '§52', 'p052']) {
    const result = search(query);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'Aufbereiteter Absatz');
    assert.equal(result[0].to, '/de/read?at=read-p052');
  }
  assert.ok(search('Gerechtigkeit').every(r => r.to.startsWith('/de/')));
  assert.deepEqual(search('zzzzkeintreffer'), []);
});

test('German defaults respect ordered regional tags, navigator fallback and explicit English/Italian routes', () => {
  assert.equal(resolveBrowserLocale({ languages: ['pl-PL', 'DE-ch', 'it'] }), 'de');
  assert.equal(resolveBrowserLocale({ languages: ['it-IT', 'de-DE'] }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['en-GB', 'de-DE'] }), 'en');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'de-AT' }), 'de');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'pl' }), 'en');
  assert.equal(resolveLocaleRoute('/en/source/p052', { languages: ['de'] }), '/en/source/p052');
  assert.equal(resolveLocaleRoute('/it/notes/n143', { languages: ['de'] }), '/it/notes/n143');
  assert.equal(resolveLocaleRoute('/search?q=W%C3%BCrde#begriff', { languages: ['de-DE'] }), '/de/search?q=W%C3%BCrde#begriff');
});
