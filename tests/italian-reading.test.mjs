import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadReadingInputs, validateReading, buildReadingIndex, estimateTrailReading } from '../scripts/reading-content.mjs';

const inputs = loadReadingInputs('it');
const { reading, corpus, coverage } = inputs;
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const english = read('content/reading/en.json');
const review = read('content/editorial/it/semantic-review.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const context = id => reading.contexts.find(c => c.paragraphId === id).explanation.text;
const main = id => reading.readingSequence.find(c => c.contextId === id).explanation?.text;
const concept = id => reading.concepts.find(c => c.id === id);

function publicBlocks() {
  const blocks = [];
  const add = (id, value, group) => blocks.push({ id, text: value.text, sourceRefs: value.sourceRefs, group });
  for (const c of reading.contexts) add(c.paragraphId, c.explanation, 'context');
  for (const e of reading.readingSequence) add(e.id, e.explanation ?? { text: e.contextLinkLabel, sourceRefs: e.sourceRefs }, 'sequence');
  for (const c of reading.concepts) {
    for (const key of ['definition', 'necessaryDistinction', 'foundation']) if (c[key]) add(`${c.id}:${key}`, c[key], 'concept');
    for (const b of c.reasoning) add(b.id, b, 'reasoning');
  }
  for (const r of reading.relations) add(r.id, r.explanation, 'relation');
  for (const t of reading.trails) {
    for (const key of ['introduction', 'qualification', 'ending']) add(`${t.id}:${key}`, t[key], 'trail');
    for (const s of t.steps) add(`${t.id}:${s.id}`, s.transition, 'transition');
    for (const key of ['prompt', 'feedback', 'scenario']) if (t.reflection[key]) add(`${t.reflection.id}:${key}`, t.reflection[key], 'reflection');
  }
  return blocks;
}

test('complete Italian reading and editorial contracts validate against their own official edition', () => {
  assert.deepEqual(validateReading(inputs), []);
  assert.equal(reading.locale, 'it');
  assert.equal(reading.editionId, corpus.editionId);
  assert.match(reading.revision, /^it-/);
  assert.notEqual(reading.revision, english.revision);
  assert.equal(reading.concepts.length, 27);
  assert.equal(reading.relations.length, 44);
  assert.equal(reading.contexts.length, 245);
  assert.equal(reading.readingSequence.length, 245);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'main').length, 203);
  assert.equal(reading.readingSequence.filter(e => e.placement === 'optional-context').length, 42);
  assert.equal(new Set(reading.contexts.map(c => c.explanation.text)).size, 245);
});

test('every Italian public block and source reference has current semantic-review evidence', () => {
  const blocks = publicBlocks();
  assert.equal(blocks.length, 762);
  assert.equal(review.blocks.length, blocks.length);
  assert.equal(new Set(review.blocks.map(b => b.id)).size, blocks.length);
  assert.equal(review.revision, reading.revision);
  for (const block of blocks) {
    const evidence = review.blocks.find(b => b.id === block.id);
    assert.ok(evidence, block.id);
    assert.equal(evidence.group, block.group, block.id);
    assert.equal(evidence.authoredSha256, hash(block.text), `renew semantic review: ${block.id}`);
    assert.deepEqual(evidence.sourceRefs, block.sourceRefs, block.id);
    for (const id of block.sourceRefs) assert.equal(evidence.sourceHashes[id], corpus.paragraphs.find(p => p.id === id).sha256, block.id);
  }
  for (const [path, expected] of Object.entries(review.artifacts)) assert.equal(hash(readFileSync(new URL(`../${path}`, import.meta.url))), expected, `renew artifact review: ${path}`);
  assert.match(review.method, /No external factual update or native-speaker proofreading is claimed/);
});

test('Italian reading index retains local quotations, dispositions, attribution and all screened notes', () => {
  const index = buildReadingIndex(inputs);
  assert.equal(index.editionId, corpus.editionId);
  assert.equal(index.paragraphs.length, 245);
  assert.equal(index.notes.length, 224);
  for (const p of index.paragraphs) {
    assert.equal(p.sourceSha256, corpus.paragraphs.find(s => s.id === p.paragraphId).sha256);
    assert.equal(p.placementExplanation, coverage.records.find(r => r.paragraphId === p.paragraphId).rationale);
    assert.equal('text' in p, false, 'raw paragraphs must not enter the public context bundle');
    for (const q of p.quotations) {
      const source = corpus.paragraphs.find(s => s.id === q.paragraphId);
      assert.equal(source.text.slice(q.start, q.end), q.text);
    }
  }
  assert.equal(index.notes.find(n => n.id === 'n223').text, corpus.footnotes.find(n => n.id === 'n223').text);
});

test('Italian notes retain bibliographic titles, four argumentative notes and preceding citation context', () => {
  const fragments = coverage.records.flatMap(r => r.exclusions).filter(e => e.matchScope === 'source-location');
  assert.deepEqual(fragments.map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'preghiera e']]);
  assert.equal(reading.reviewedNotes.length, 224);
  assert.deepEqual(reading.reviewedNotes.filter(n => n.classification === 'source-argument-and-citation').map(n => n.id), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n211').previousNoteId, 'n210');
  assert.equal(reading.reviewedNotes.find(n => n.id === 'n184').previousNoteId, 'n183');
  assert.match(corpus.footnotes.find(n => n.id === 'n223').text, /Veglia di preghiera e del Rosario per la pace/);
  assert.match(corpus.footnotes.find(n => n.id === 'n175').text, /1866/);
  assert.match(corpus.footnotes.find(n => n.id === 'n182').text, /preventivi/);
  assert.equal(corpus.footnotes.find(n => n.id === 'n124').sourceMarker, '[ 124]');
  assert.deepEqual(review.notes.map(n => [n.id, n.sourceSha256, n.classification]), reading.reviewedNotes.map(n => [n.id, n.sourceSha256, n.classification]));
});

test('Italian public prose is individually authored, without copied English reading placeholders', () => {
  for (const [i, c] of reading.contexts.entries()) assert.notEqual(c.explanation.text, english.contexts[i].explanation.text, c.paragraphId);
  for (const [i, e] of reading.readingSequence.entries()) {
    assert.notEqual(e.title, english.readingSequence[i].title, e.id);
    assert.match(e.contextLinkLabel, /^Contesto della fonte/);
  }
  for (const [i, c] of reading.concepts.entries()) {
    assert.notEqual(c.title, english.concepts[i].title, c.id);
    assert.notEqual(c.definition.text, english.concepts[i].definition.text, c.id);
    assert.notEqual(c.necessaryDistinction.text, english.concepts[i].necessaryDistinction.text, c.id);
    for (const [j, b] of c.reasoning.entries()) assert.notEqual(b.text, english.concepts[i].reasoning[j].text, b.id);
  }
  for (const [i, r] of reading.relations.entries()) assert.notEqual(r.explanation.text, english.relations[i].explanation.text, r.id);
});

test('Italian main reading preserves dignity, care, property, subsidiarity and contested normative positions', () => {
  assert.match(main('p052'), /morale.*sociale.*esistenziale.*ontologica/);
  assert.match(main('p052'), /non la cancellano/);
  assert.match(main('p055'), /concepimento.*aborto.*eutanasia/);
  assert.match(main('p055'), /attribuzione/);
  assert.match(main('p066'), /diritto alla proprietà privata.*sempre subordinato/);
  assert.match(main('p069'), /non ne giustifica il disimpegno/);
  assert.match(main('p070'), /nella costruzione delle decisioni/);
  assert.match(main('p118'), /dovere.*eliminare la sofferenza/);
  assert.match(main('p118'), /non equivale a rifiutare cure/);
  assert.match(main('p165'), /un uomo e una donna/);
  assert.match(main('p165'), /posizione normativa della fonte/);
  assert.match(concept('family').necessaryDistinction.text, /attribuita/);
});

test('Italian IA claims and work qualifications remain attributed and visible', () => {
  assert.match(main('p098'), /obsolete/);
  assert.match(main('p099'), /benefici concreti/);
  assert.match(main('p099'), /attribuite.*non dichiarate consenso scientifico/);
  assert.match(concept('ai-limits').necessaryDistinction.text, /non come consenso scientifico/);
  assert.match(main('p149'), /aiuti economici.*necessari/);
  assert.match(main('p149'), /non si guadagna lavorando/);
  assert.match(main('p152'), /auspicabile.*pericolose/);
  assert.match(main('p153'), /Non esiste un unico modello/);
  assert.match(main('p154'), /non deve pregiudicare la partecipazione/);
});

test('Italian institutional criticism and practical conclusion survive theological placement', () => {
  assert.match(main('p089'), /vittime di abusi spirituali, economici, istituzionali, sessuali, di potere e di coscienza/);
  assert.match(main('p138'), /giornalisti.*abusi.*vittime/);
  assert.match(main('p176'), /istituzioni ecclesiastiche possedettero schiavi/);
  assert.match(main('p176'), /regolò e legittimò/);
  assert.match(main('p176'), /richiesta di perdono a nome della Chiesa/);
  assert.match(main('p177'), /prevenzione, protezione, liberazione e riabilitazione/);
  assert.match(main('p236'), /ruolo attivo/);
  assert.match(main('p239'), /visita a chi è solo e servizio ai poveri/);
  assert.match(main('p240'), /condizioni dei lavoratori/);
  assert.match(main('p244'), /vedova, orfano, straniero, bambino ferito, esule e fuggiasco/);
  assert.match(main('p245'), /condividendo ciò che siamo e ciò che abbiamo/);
  assert.match(context('p234'), /sacramentale/);
  assert.match(context('p243'), /condizioni politiche rimaste oppressive/);
});

test('Italian military AI keeps non-delegation, prudent values, judgement time and civilian protections together', () => {
  assert.match(main('p192'), /difesa nel senso più stretto/);
  assert.match(main('p197'), /ultima risorsa.*legittima difesa/);
  assert.match(main('p198'), /decisioni letali o irreversibili/);
  assert.match(main('p198'), /infondere valori e giudizio prudente/);
  assert.match(main('p199'), /tempo per il giudizio morale/);
  assert.match(main('p199'), /combattenti e non combattenti/);
  assert.match(main('p200'), /effettivo, consapevole e responsabile/);
  assert.match(main('p200'), /pulsante non bastano/);
  assert.match(main('p228'), /disarmata e disarmante, umile e perseverante/);
  assert.match(main('p228'), /impegno a realizzarlo nelle relazioni e nella società/);
});

test('all six Italian trails preserve finite identities, optional unscored reflections and recomputed estimates', () => {
  assert.equal(reading.trails.length, 6);
  assert.equal(reading.trails.reduce((n, t) => n + t.steps.length, 0), 32);
  assert.equal(reading.trails.filter(t => t.reflection.scenario).length, 4);
  for (const [i, t] of reading.trails.entries()) {
    assert.notEqual(t.title, english.trails[i].title);
    assert.equal(t.reflection.optional, true);
    assert.equal(t.reflection.responseFormat, 'think-then-reveal');
    assert.notEqual(t.ending.text, english.trails[i].ending.text);
    assert.ok(t.relatedTrailIds.length > 0);
    if (t.reflection.scenario) assert.ok(t.reflection.scenario.text.startsWith(reading.localeMetadata.scenarioPrefix));
    const estimate = estimateTrailReading(t, reading);
    for (const key of ['words', 'wordsPerMinute', 'minutes']) assert.equal(t.readingEstimate[key], estimate[key], `${t.id}:${key}`);
    assert.equal(t.readingEstimate.label, 'Tempo di lettura stimato');
    assert.match(t.readingEstimate.method, /tempo effettivo.*varia/);
  }
});
