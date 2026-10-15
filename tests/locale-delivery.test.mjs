import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLocaleLoader } from '../scripts/locale-loader.mjs';
import { english, validateMessages, formatMessage } from '../scripts/messages.mjs';
import { loadReadingInputs, validateReading, buildReadingIndex } from '../scripts/reading-content.mjs';
import { searchPublished, normalizeQuery } from '../scripts/search.mjs';
import { newReadingState, decodeReadingState, locationRoute } from '../scripts/reading-state.mjs';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('message schemas require every key, reject extra keys and match every placeholder occurrence', () => {
  assert.deepEqual(validateMessages(english), []);
  const absent = { ...english }; delete absent['state.returned'];
  assert.match(validateMessages(absent).join(), /Missing message state.returned/);
  assert.match(validateMessages({ ...english, unreviewed: 'extra' }).join(), /Unknown message/);
  assert.match(validateMessages({ ...english, 'state.returned': 'Returned to {other}.' }).join(), /Placeholder mismatch/);
  assert.match(validateMessages({ ...english, 'state.returned': '{place} {place}' }).join(), /Placeholder mismatch/);
  assert.match(validateMessages({ ...english, 'state.returned': '' }).join(), /Missing message/);
  assert.equal(formatMessage(english, 'state.returned', { place: '§52' }), 'Returned to §52.');
  assert.throws(() => formatMessage(english, 'state.returned', {}), /values mismatch/);
  assert.throws(() => formatMessage(english, 'state.returned', { place: 'x', extra: true }), /values mismatch/);
});

test('active locale publication is atomic and ignores a slower preceding switch', async () => {
  const slow = deferred(); const publications = [];
  const loader = createLocaleLoader({
    ar: { library: () => slow.promise, messages: async () => ({ label: 'AR' }) },
    en: { library: async () => ({ editionId: 'EN' }), messages: async () => ({ label: 'EN' }) },
  });
  const first = loader.activate('ar', value => publications.push(value));
  await loader.activate('en', value => publications.push(value));
  slow.resolve({ editionId: 'AR' });
  assert.equal(await first, false);
  assert.deepEqual(publications, [{ locale: 'en', library: { editionId: 'EN' }, messages: { label: 'EN' } }]);
});

test('locale/resource caches deduplicate, isolate failure/retry and never request inactive data', async () => {
  const calls = []; let fail = true;
  const loader = createLocaleLoader({
    ar: { context: async () => { calls.push('ar-context'); if (fail) throw new Error('offline'); return 'AR'; }, sequence: async () => { calls.push('ar-sequence'); return []; } },
    en: { context: async () => { calls.push('en-context'); return 'EN'; } },
  });
  await assert.rejects(loader.load('ar', 'context'), /offline/);
  const [a, b] = await Promise.all([loader.load('en', 'context'), loader.load('en', 'context')]);
  assert.equal(a, 'EN'); assert.equal(b, 'EN');
  fail = false; assert.equal(await loader.load('ar', 'context'), 'AR');
  await assert.rejects(loader.load('xx', 'context'), /Unavailable/);
  assert.deepEqual(calls, ['ar-context', 'en-context', 'ar-context']);
});

test('stale activation failure cannot replace a newer successful edition', async () => {
  const slow = deferred(); const published = [];
  const loader = createLocaleLoader({ ar: { library: () => slow.promise, messages: async () => 'AR' }, en: { library: async () => 'EN', messages: async () => 'EN' } });
  const stale = loader.activate('ar', value => published.push(value.locale));
  await loader.activate('en', value => published.push(value.locale));
  slow.reject(new Error('late offline'));
  assert.equal(await stale, false); assert.deepEqual(published, ['en']);
});

test('missing localized authoring fails closed and source validation binds to the active edition', async () => {
  // Every declared locale can acquire authored files. Exercise absence in an
  // isolated project so the regression survives completion of those editions.
  const fixture = mkdtempSync(join(tmpdir(), 'mh-missing-authoring-'));
  try {
    mkdirSync(join(fixture, 'scripts'));
    for (const name of ['reading-content.mjs', 'validate-editorial.mjs', 'locales.mjs']) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(fixture, 'scripts', name));
    }
    const isolated = await import(pathToFileURL(join(fixture, 'scripts', 'reading-content.mjs')).href);
    assert.throws(() => isolated.loadReadingInputs('ar'), /ENOENT/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
  assert.throws(() => loadReadingInputs('../en'), /Unknown locale/);
  const inputs = loadReadingInputs();
  assert.deepEqual(validateReading(inputs), []);
  const ar = JSON.parse(readFileSync(new URL('../content/source/ar/corpus.json', import.meta.url)));
  assert.match(validateReading({ ...inputs, corpus: ar }).join(), /active source hash mismatch/);
  assert.match(validateReading({ ...inputs, corpus: ar }).join(), /quotation must be exact/);
  const changed = structuredClone(inputs); changed.coverage.records[0].sourceSha256 = 'wrong-edition';
  assert.throws(() => buildReadingIndex(changed), /active source hash mismatch/);
  const incomplete = structuredClone(inputs); incomplete.reading.contexts.pop();
  assert.match(validateReading(incomplete).join(), /Complete paragraph adaptation/);
});

test('search uses selected locale labels, routes, number formatting and normalization', () => {
  const inputs = loadReadingInputs(); const reading = inputs.reading;
  const messages = { ...english, 'search.paragraph': 'فقرة', 'search.paragraph_keyword': 'فقرة' };
  const results = searchPublished(reading, reading.readingSequence, 'فقرة ٥٢', { locale: 'ar', messages });
  assert.equal(results.length, 1); assert.equal(results[0].type, 'فقرة');
  assert.match(results[0].to, /^\/ar\/read\?/); assert.ok(results[0].title.includes(new Intl.NumberFormat('ar', { numberingSystem: 'arab' }).format(52)));
  assert.equal(normalizeQuery('İ', 'tr'), 'i');
});

test('English storage compatibility and revision migration remain unchanged; locale records stay independent', () => {
  const location = { kind: 'concept', entityId: 'dignity', blockId: 'old-block', offset: 12 };
  const state = newReadingState('old', 'en-edition'); state.saved.push(location);
  const result = decodeReadingState(JSON.stringify(state), 'new', 'en-edition', { concept: [{ id: 'dignity', blocks: ['dignity-idea'] }] });
  assert.equal(result.state.locale, 'en'); assert.equal(result.state.saved[0].blockId, undefined);
  assert.equal(result.state.saved[0].offset, 0); assert.match(result.notice, /updated/);
  assert.equal(locationRoute({ kind: 'source', entityId: 'p052', offset: 0 }), '/en/source/p052');
  assert.equal(locationRoute({ kind: 'source', entityId: 'p052', offset: 0 }, 'ar'), '/ar/source/p052');
  assert.equal(newReadingState('ar-r1', 'ar-edition', 'ar').locale, 'ar');
  assert.equal(decodeReadingState(JSON.stringify(state), 'ar-r1', 'ar-edition', {}, 'ar').state.saved.length, 0);
});

test('all Vue interface text and static accessible names come from the typed catalog', async () => {
  const { readdirSync } = await import('node:fs');
  const { parse: parseSfc } = await import('@vue/compiler-sfc');
  const { parse } = await import('@vue/compiler-dom');
  const paths = ['../src/App.vue', ...['views', 'components'].flatMap(dir => readdirSync(new URL(`../src/${dir}/`, import.meta.url)).filter(name => name.endsWith('.vue')).map(name => `../src/${dir}/${name}`))];
  const uncataloged = [];
  for (const path of paths) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const { descriptor } = parseSfc(source);
    const ast = parse(descriptor.template.content);
    function walk(node) {
      if (node.type === 2 && /[A-Za-z]{2}/.test(node.content)) uncataloged.push(`${path}: ${node.content.trim()}`);
      for (const prop of node.props ?? []) if (prop.type === 6 && ['aria-label', 'title', 'alt', 'placeholder'].includes(prop.name) && /[A-Za-z]/.test(prop.value?.content ?? '')) uncataloged.push(`${path}: ${prop.name}`);
      for (const child of node.children ?? []) walk(child);
    }
    walk(ast);
    for (const [, key] of source.matchAll(/(?:msg|t)\('([^']+)'/g)) assert.ok(key in english, `${path}: missing ${key}`);
    assert.ok(!source.includes('/en/'), `${path}: English route coupling`);
  }
  assert.deepEqual(uncataloged, []);
});

test('displayed dispositions and saved block labels use translated catalog values, never English enum/ID words', async () => {
  const { formatDisposition, formatSavedBlock } = await import('../scripts/messages.mjs');
  const messages = { ...english,
    'disposition.retain': 'Conservato', 'disposition.adapt': 'Adattato', 'disposition.context': 'Contesto', 'disposition.omit-devotional': 'Formula esclusa', 'disposition.unavailable': 'Non disponibile',
    'block.idea': 'Idea iniziale', 'block.distinction': 'Distinzione necessaria', 'block.connections': 'Collegamenti', 'block.reasoning': 'Ragionamento {number}', 'block.description': '{title} · {section}', 'block.unavailable': 'Blocco non disponibile · {id}',
  };
  assert.deepEqual(['retain', 'adapt', 'context', 'omit-devotional', 'unknown'].map(value => formatDisposition(value, messages)), ['Conservato', 'Adattato', 'Contesto', 'Formula esclusa', 'Non disponibile']);
  const concepts = [{ id: 'dignity', title: 'Dignità umana', reasoning: [{ id: 'dignity-reasoning-1' }] }];
  assert.equal(formatSavedBlock('dignity-idea', concepts, 'it', messages), 'Dignità umana · Idea iniziale');
  assert.equal(formatSavedBlock('dignity-distinction', concepts, 'it', messages), 'Dignità umana · Distinzione necessaria');
  assert.equal(formatSavedBlock('dignity-connections', concepts, 'it', messages), 'Dignità umana · Collegamenti');
  assert.equal(formatSavedBlock('dignity-reasoning-1', concepts, 'it', messages), 'Dignità umana · Ragionamento 1');
  assert.equal(formatSavedBlock('read-p052', concepts, 'it', messages), '§52');
  assert.equal(formatSavedBlock('old-block', concepts, 'it', messages), 'Blocco non disponibile · old-block');
  const source = readFileSync(new URL('../src/views/Source.vue', import.meta.url), 'utf8');
  assert.ok(source.includes('value1: dispositionLabel(current.disposition)'));
});

test('explicit activation cancellation prevents pending content from publishing', async () => {
  const waiting = deferred(); const published = [];
  const loader = createLocaleLoader({ fixture: { library: () => waiting.promise, messages: async () => english } });
  const activation = loader.activate('fixture', value => published.push(value));
  loader.cancelActivation();
  waiting.resolve({ editionId: 'fixture-only' });
  assert.equal(await activation, false);
  assert.deepEqual(published, []);
});
