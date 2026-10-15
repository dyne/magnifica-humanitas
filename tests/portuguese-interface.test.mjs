import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished } from '../scripts/search.mjs';
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const messages = read('content/messages/pt.json');
const { reading } = loadReadingInputs('pt');

test('Portuguese publication requires complete reading and all 291 keys with exact placeholder parity', () => {
  assert.deepEqual(validateMessages(messages), []);
  assert.deepEqual(validateReading(loadReadingInputs('pt')), []);
  assert.equal(Object.keys(messages).length, 291);
  const neutral = new Set(['app.magnifica_humanitas', 'app.atlas', 'concept.value_magnifica_humanitas', 'block.description', 'source.page', 'source.pages', 'route.concept', 'note.source_value']);
  for (const [key, text] of Object.entries(messages)) if (!neutral.has(key)) assert.notEqual(text, english[key], key);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es', 'fr', 'pt']);
  for (const l of localeRegistry.filter(l => !['en', 'it', 'de', 'es', 'fr', 'pt'].includes(l.id))) assert.equal(l.reviewed, false);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /em português/);
  const evidence = read('content/editorial/pt/interface-review.json');
  assert.equal(evidence.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/pt.json', import.meta.url))).digest('hex'));
  assert.equal(evidence.readingRevision, reading.revision);
});

test('Portuguese relation labels, saved labels, dynamic notices and numeric formatting match the edition', () => {
  for (const r of read('content/editorial/pt/alignment-review.json').relationLabels) assert.equal(messages[`relation.${r.type}`], r.label);
  assert.equal(formatDisposition('retain', messages), 'manter');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'pt', messages), 'Dignidade humana · Raciocínio 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Dignidade humana' }), 'De volta a Dignidade humana.');
  assert.equal(new Intl.NumberFormat('pt').format(24500), '24.500');
});

test('Portuguese search handles accents, case and the localized parágrafo keyword', () => {
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'pt', messages });
  assert.equal(search('EDUCACAO')[0].id, 'concept-education');
  assert.equal(search('DIGNIDADE HUMANA')[0].id, 'concept-dignity');
  for (const query of ['PARAGRAFO 52', 'parágrafo 52', '§52', 'p052']) {
    const result = search(query);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'Parágrafo adaptado');
    assert.equal(result[0].to, '/pt/read?at=read-p052');
  }
  assert.ok(search('justiça').every(r => r.to.startsWith('/pt/')));
  assert.deepEqual(search('zzzzsansresultat'), []);
});

test('Portuguese defaults use ordered regional preferences and explicit available URLs', () => {
  assert.equal(resolveBrowserLocale({ languages: ['pl-PL', 'PT-br', 'it'] }), 'pt');
  assert.equal(resolveBrowserLocale({ languages: ['it-IT', 'pt-PT'] }), 'it');
  assert.equal(resolveBrowserLocale({ languages: ['de-AT', 'pt-AO'] }), 'de');
  assert.equal(resolveBrowserLocale({ languages: ['es-MX', 'pt-MZ'] }), 'es');
  assert.equal(resolveBrowserLocale({ languages: ['fr-FR', 'pt-PT'] }), 'fr');
  assert.equal(resolveBrowserLocale({ languages: ['en-GB', 'pt-PT'] }), 'en');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'pt-BR' }), 'pt');
  assert.equal(resolveBrowserLocale({ languages: ['ar', 'ru'], language: 'pl' }), 'en');
  for (const route of ['/en/source/p052', '/it/notes/n143', '/de/concepts/dignity', '/es/about', '/fr/concepts/dignity']) assert.equal(resolveLocaleRoute(route, { languages: ['pt'] }), route);
  assert.equal(resolveLocaleRoute('/search?q=educa%C3%A7%C3%A3o#concept', { languages: ['pt-PT'] }), '/pt/search?q=educa%C3%A7%C3%A3o#concept');
});
