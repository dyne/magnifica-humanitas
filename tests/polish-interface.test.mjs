import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished, normalizeQuery } from '../scripts/search.mjs';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const messages = read('content/messages/pl.json');
const { reading } = loadReadingInputs('pl');

test('Polish publication requires complete reading and 291 localized keys with exact placeholder parity', () => {
  assert.deepEqual(validateMessages(messages), []);
  assert.deepEqual(validateReading(loadReadingInputs('pl')), []);
  assert.equal(Object.keys(messages).length, 291);
  const neutral = new Set(['app.magnifica_humanitas', 'app.atlas', 'concept.value_magnifica_humanitas', 'block.description']);
  for (const [key, text] of Object.entries(messages)) if (!neutral.has(key)) assert.notEqual(text, english[key], key);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es', 'fr', 'pt', 'pl']);
  for (const l of localeRegistry.filter(l => !['en', 'it', 'de', 'es', 'fr', 'pt', 'pl'].includes(l.id))) assert.equal(l.reviewed, false);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /polskie opracowanie.*Leona XIV/);
  const evidence = read('content/editorial/pl/interface-review.json');
  assert.equal(evidence.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/pl.json', import.meta.url))).digest('hex'));
  assert.equal(evidence.readingRevision, reading.revision);
});

test('Polish relation, saved and numeric labels retain meanings and grammatically neutral counts', () => {
  for (const r of read('content/editorial/pl/alignment-review.json').relationLabels) assert.equal(messages[`relation.${r.type}`], r.label);
  assert.equal(formatDisposition('retain', messages), 'zachowanie');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'pl', messages), 'Godność człowieka · Rozumowanie 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Godność człowieka' }), 'Powrót do: Godność człowieka.');
  assert.equal(new Intl.NumberFormat('pl').format(24500), '24\u00a0500');
  assert.equal(formatMessage(messages, 'search.value_results', { value1: '1' }), 'Wyniki: 1');
  assert.equal(messages['source.pages'], 'str.');
  assert.match(messages['note.bibliographic_context_ibid_refers_to_the_preceding_citation'], /Tamże.*dzieła.*Tenże.*autora/);
});

test('Polish search folds accents and case and recognizes akapit and stable paragraph IDs', () => {
  assert.equal(normalizeQuery('ŁÓDŹ', 'pl-PL'), 'lodz');
  assert.equal(normalizeQuery('ŁÓDŹ', 'en'), 'łodz');
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'pl', messages });
  assert.equal(search('GODNOSC CZLOWIEKA')[0].id, 'concept-dignity');
  assert.equal(search('POMOCNICZOSC')[0].id, 'concept-subsidiarity');
  for (const query of ['AKAPIT 52', 'akapit 52', '§52', 'p052']) {
    const result = search(query);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'Opracowany akapit');
    assert.equal(result[0].to, '/pl/read?at=read-p052');
  }
  assert.ok(search('sprawiedliwość').every(r => r.to.startsWith('/pl/')));
  assert.deepEqual(search('zzzzbrakwyniku'), []);
});

test('Polish browser defaults preserve ordered regional preferences and explicit language URLs', () => {
  assert.equal(resolveBrowserLocale({ languages: ['be-BY', 'PL-pl', 'it'] }), 'pl');
  for (const locale of ['en-GB', 'it-IT', 'de-AT', 'es-MX', 'fr-FR', 'pt-BR']) assert.equal(resolveBrowserLocale({ languages: [locale, 'pl-PL'] }), locale.split('-')[0]);
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'pl-PL' }), 'pl');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'be' }), 'en');
  for (const route of ['/en/source/p052', '/it/notes/n143', '/de/concepts/dignity', '/es/about', '/fr/concepts/dignity', '/pt/read']) assert.equal(resolveLocaleRoute(route, { languages: ['pl'] }), route);
  assert.equal(resolveLocaleRoute('/search?q=godno%C5%9B%C4%87#concept', { languages: ['pl-PL'] }), '/pl/search?q=godno%C5%9B%C4%87#concept');
});
