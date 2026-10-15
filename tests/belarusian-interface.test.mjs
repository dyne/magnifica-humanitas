import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished, normalizeQuery } from '../scripts/search.mjs';
const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const messages = read('content/messages/be.json');
const { reading } = loadReadingInputs('be');

test('Belarusian publication binds complete reading and all291 catalog keys without English filler', () => {
  assert.deepEqual(validateReading(loadReadingInputs('be')), []);
  assert.deepEqual(validateMessages(messages), []);
  assert.equal(Object.keys(messages).length, 291);
  const neutral = new Set(['app.magnifica_humanitas', 'concept.value_magnifica_humanitas', 'block.description']);
  for (const [key, value] of Object.entries(messages)) if (!neutral.has(key)) assert.notEqual(value, english[key], key);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es', 'fr', 'pt', 'pl', 'be', 'ru', 'ar']);
  for (const l of localeRegistry.filter(l => ['ja', 'zh'].includes(l.id))) assert.equal(l.reviewed, false);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /беларускае.*Льва XIV/);
  const review = read('content/editorial/be/interface-review.json');
  assert.equal(review.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/be.json', import.meta.url))).digest('hex'));
  assert.equal(review.readingRevision, 'be-2026-10-15-reading-2');
});

test('Belarusian numeric, relation and saved labels retain meaning with neutral count grammar', () => {
  for (const r of read('content/editorial/be/alignment-review.json').relationLabels) assert.equal(messages[`relation.${r.type}`], r.label);
  assert.equal(formatDisposition('retain', messages), 'захаваць');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'be', messages), 'Годнасць чалавека · Разважанне 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Годнасць чалавека' }), 'Вяртанне да: Годнасць чалавека.');
  assert.equal(new Intl.NumberFormat('be').format(24500), '24\u00a0500');
  assert.equal(formatMessage(messages, 'search.value_results', { value1: '1' }), 'Вынікі: 1');
  assert.match(messages['note.bibliographic_context_ibid_refers_to_the_preceding_citation'], /Тамсама.*іншы твор.*аўтара.*Той жа/);
});

test('Belarusian search normalizes canonically without conflating its distinct Cyrillic letters', () => {
  assert.equal(normalizeQuery('ЙЁЎ І', 'be-BY'), 'йёў і');
  assert.equal(normalizeQuery('и\u0306е\u0308у\u0306', 'be'), normalizeQuery('йёў', 'be'));
  for (const [a, b] of [['ў', 'у'], ['ё', 'е'], ['й', 'и'], ['і', 'и']]) assert.notEqual(normalizeQuery(a, 'be'), normalizeQuery(b, 'be'));
  assert.equal(normalizeQuery('ŁÓDŹ', 'pl'), 'lodz');
  assert.equal(normalizeQuery('ŁÓDŹ', 'en'), 'łodz');
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'be', messages });
  assert.equal(search('ГОДНАСЦЬ ЧАЛАВЕКА')[0].id, 'concept-dignity');
  assert.equal(search('СУБСІДЫЯРНАСЦЬ')[0].id, 'concept-subsidiarity');
  for (const q of ['ПАРАГРАФ 52', 'параграф 52', '§52', 'p052']) {
    assert.equal(search(q).length, 1);
    assert.equal(search(q)[0].to, '/be/read?at=read-p052');
    assert.equal(search(q)[0].type, 'Адаптаваны параграф');
  }
  assert.deepEqual(search('zzzzнямавыніку'), []);
});

test('Belarusian regional browser defaults respect first-supported order and explicit routes', () => {
  assert.equal(resolveBrowserLocale({ languages: ['zh-CN', 'BE-by', 'pl-PL'] }), 'be');
  for (const locale of ['en-GB', 'it-IT', 'de-AT', 'es-MX', 'fr-BE', 'pt-BR', 'pl-PL']) assert.equal(resolveBrowserLocale({ languages: [locale, 'be-BY'] }), locale.split('-')[0]);
  assert.equal(resolveBrowserLocale({ languages: ['ja', 'zh'], language: 'be-BY' }), 'be');
  assert.equal(resolveBrowserLocale({ languages: ['ja', 'zh'], language: 'zh' }), 'en');
  for (const route of ['/en/source/p052', '/it/notes/n143', '/de/concepts/dignity', '/es/about', '/fr/concepts/dignity', '/pt/read', '/pl/saved']) assert.equal(resolveLocaleRoute(route, { languages: ['be'] }), route);
  assert.equal(resolveLocaleRoute('/search?q=care#stable', { languages: ['be-BY'] }), '/be/search?q=care#stable');
});
