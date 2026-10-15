import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished } from '../scripts/search.mjs';
const messages = JSON.parse(readFileSync(new URL('../content/messages/it.json', import.meta.url)));
const { reading } = loadReadingInputs('it');

test('Italian publication requires complete reading and all 291 translated interface keys and placeholders', () => {
  assert.deepEqual(validateMessages(messages), []);
  assert.deepEqual(validateReading(loadReadingInputs('it')), []);
  assert.equal(Object.keys(messages).length, 291);
  const languageNeutral = new Set(['app.magnifica_humanitas', 'concept.value_magnifica_humanitas', 'block.description']);
  for (const [key, text] of Object.entries(messages)) if (!languageNeutral.has(key)) assert.notEqual(text, english[key], `untranslated ${key}`);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es']);
  for (const l of localeRegistry.filter(l => !['en', 'it', 'de', 'es'].includes(l.id))) assert.equal(l.reviewed, false);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /in italiano/);
  const review = JSON.parse(readFileSync(new URL('../content/editorial/it/interface-review.json', import.meta.url)));
  assert.equal(review.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/it.json', import.meta.url))).digest('hex'));
  assert.equal(review.readingRevision, reading.revision);
});

test('Italian interface uses reviewed relationship terminology and localized display metadata', () => {
  const alignment = JSON.parse(readFileSync(new URL('../content/editorial/it/alignment-review.json', import.meta.url)));
  for (const relation of alignment.relationLabels) assert.equal(messages[`relation.${relation.type}`], relation.label);
  assert.equal(formatDisposition('retain', messages), 'conservare');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'it', messages), 'Dignità umana · Ragionamento 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Dignità umana' }), 'Ritorno a Dignità umana.');
  assert.equal(new Intl.NumberFormat('it').format(24500), '24.500');
});

test('Italian search accepts accents, case and localized paragraph keywords and returns stable Italian routes', () => {
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'it', messages });
  assert.equal(search('DIGNITÀ')[0].id, 'concept-dignity');
  assert.equal(search('sussidiarieta')[0].id, 'concept-subsidiarity');
  for (const query of ['paragrafo 52', '§52', 'p052']) {
    const result = search(query);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'Paragrafo adattato');
    assert.equal(result[0].to, '/it/read?at=read-p052');
  }
  assert.ok(search('giustizia').every(r => r.to.startsWith('/it/')));
  assert.deepEqual(search('zzzznessunrisultato'), []);
});

test('Italian browser defaults preserve preference order, explicit English and neutral-entry independence', () => {
  assert.equal(resolveBrowserLocale({ languages: ['fr-FR', 'IT-it', 'en'] }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['en-GB', 'it-IT'] }), 'en');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'it-CH' }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'fr' }), 'en');
  assert.equal(resolveLocaleRoute('/en/source/p052', { languages: ['it'] }), '/en/source/p052');
  assert.equal(resolveLocaleRoute('/search?q=dignit%C3%A0#termine', { languages: ['it-IT'] }), '/it/search?q=dignit%C3%A0#termine');
});
