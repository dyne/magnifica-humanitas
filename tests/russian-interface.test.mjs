import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { english, validateMessages, formatMessage, formatDisposition, formatSavedBlock } from '../scripts/messages.mjs';
import { availableLocales, localeRegistry, resolveBrowserLocale, resolveLocaleRoute } from '../scripts/locales.mjs';
import { loadReadingInputs, validateReading } from '../scripts/reading-content.mjs';
import { searchPublished, normalizeQuery } from '../scripts/search.mjs';
const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const messages = read('content/messages/ru.json');
const { reading } = loadReadingInputs('ru');

test('Russian publication binds its complete reading and all 291 translated catalog keys', () => {
  assert.deepEqual(validateReading(loadReadingInputs('ru')), []);
  assert.deepEqual(validateMessages(messages), []);
  assert.equal(Object.keys(messages).length, 291);
  const neutral = new Set(['app.magnifica_humanitas', 'concept.value_magnifica_humanitas', 'block.description']);
  for (const [key, value] of Object.entries(messages)) if (!neutral.has(key)) assert.notEqual(value, english[key], key);
  assert.deepEqual(availableLocales.map(l => l.id), ['en', 'it', 'de', 'es', 'fr', 'pt', 'pl', 'be', 'ru', 'ar']);
  assert.equal(messages['about.mh_en_owner_2026'], reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'], /русское.*Льва XIV/);
  const review = read('content/editorial/ru/interface-review.json');
  assert.equal(review.catalogSha256, createHash('sha256').update(readFileSync(new URL('../content/messages/ru.json', import.meta.url))).digest('hex'));
  assert.equal(review.readingRevision, reading.revision);
});

test('Russian counts, relation labels, saved blocks and notices retain their meanings', () => {
  for (const r of read('content/editorial/ru/alignment-review.json').relationLabels) assert.equal(messages[`relation.${r.type}`], r.label);
  assert.equal(formatDisposition('retain', messages), 'сохранить');
  assert.equal(formatSavedBlock('dignity-worth', reading.concepts, 'ru', messages), 'Достоинство человека · Рассуждение 1');
  assert.equal(formatMessage(messages, 'state.returned', { place: 'Достоинство человека' }), 'Возврат к: Достоинство человека.');
  assert.equal(new Intl.NumberFormat('ru').format(24500), '24\u00a0500');
  for (const count of ['1', '2', '5']) assert.equal(formatMessage(messages, 'search.value_results', { value1: count }), `Результатов: ${count}`);
  assert.match(messages['note.bibliographic_context_ibid_refers_to_the_preceding_citation'], /«там же».*«он же».*другой его труд/);
});

test('Russian search accepts canonical input and deliberately preserves й and ё distinctions', () => {
  assert.equal(normalizeQuery('ЙЁ И Е', 'ru-RU'), 'йё и е');
  assert.equal(normalizeQuery('и\u0306е\u0308', 'ru'), 'йё');
  for (const [a, b] of [['й', 'и'], ['ё', 'е'], ['всё', 'все'], ['мой', 'мои']]) assert.notEqual(normalizeQuery(a, 'ru'), normalizeQuery(b, 'ru'));
  assert.equal(normalizeQuery('и\u0306е\u0308у\u0306', 'be'), 'йёў');
  assert.equal(normalizeQuery('ŁÓDŹ', 'pl'), 'lodz');
  assert.equal(normalizeQuery('DÍGNITY', 'en'), 'dignity');
  const search = q => searchPublished(reading, reading.readingSequence, q, { locale: 'ru', messages });
  assert.equal(search('ДОСТОИНСТВО ЧЕЛОВЕКА')[0].id, 'concept-dignity');
  assert.equal(search('СУБСИДИАРНОСТЬ')[0].id, 'concept-subsidiarity');
  assert.equal(search('СКРЫТЫЙ ТРУД И ЭКСПЛУАТАЦИЯ'.normalize('NFD'))[0].id, 'concept-exploitation');
  for (const q of ['ПАРАГРАФ 52', 'параграф 52', '§52', 'p052']) {
    assert.equal(search(q).length, 1);
    assert.equal(search(q)[0].to, '/ru/read?at=read-p052');
    assert.equal(search(q)[0].type, 'Адаптированный параграф');
  }
  assert.deepEqual(search('zzzzнетрезультата'), []);
  const fixture = { concepts: ['всё', 'все', 'мой', 'мои'].map((title, i) => ({ id: `${i}`, title, definition: { text: title, sourceRefs: ['p001'] }, necessaryDistinction: { text: '' }, reasoning: [] })), relations: [], trails: [] };
  for (const [q, id] of [['всё', 'concept-0'], ['все', 'concept-1'], ['мой', 'concept-2'], ['мои', 'concept-3']]) assert.deepEqual(searchPublished(fixture, [], q, { locale: 'ru', messages }).map(r => r.id), [id]);
});

test('Russian regional defaults obey ordered support, language backup and explicit URLs', () => {
  assert.equal(resolveBrowserLocale({ languages: ['zh-CN', 'RU-ru', 'pl-PL'] }), 'ru');
  for (const locale of ['en-GB', 'it-IT', 'de-AT', 'es-MX', 'fr-BE', 'pt-BR', 'pl-PL', 'be-BY']) assert.equal(resolveBrowserLocale({ languages: [locale, 'ru-RU'] }), locale.split('-')[0]);
  assert.equal(resolveBrowserLocale({ languages: ['ja', 'zh'], language: 'ru-KZ' }), 'ru');
  assert.equal(resolveBrowserLocale({ languages: ['ja', 'zh'], language: 'ja' }), 'en');
  for (const route of ['/en/source/p052', '/it/notes/n143', '/de/concepts/dignity', '/es/about', '/fr/concepts/dignity', '/pt/read', '/pl/saved', '/be/search']) assert.equal(resolveLocaleRoute(route, { languages: ['ru'] }), route);
  assert.equal(resolveLocaleRoute('/search?q=care#stable', { languages: ['ru-RU'] }), '/ru/search?q=care#stable');
});
