import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relationTypes } from '../scripts/validate-editorial.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const corpus = read('content/source/es/corpus.json');
const review = read('content/editorial/es/alignment-review.json');
const sourceAlignment = read('content/source/es/alignment.json');
const englishConcepts = read('content/editorial/concepts.json').concepts;
const paragraphs = new Map(corpus.paragraphs.map(p => [p.id, p]));
const hash = text => createHash('sha256').update(text).digest('hex');
const intersects = (a, b) => a.paragraphId === b.paragraphId && a.start < b.end && b.start < a.end;

// Internal authoring evidence: this contract does not enable publication or
// establish semantic fidelity. L5.2/L5.3 require independent content/UI gates.
function alignmentErrors(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(data.locale === 'es' && data.editionId === corpus.editionId, 'edition');
  check(data.sourceHtmlSha256 === corpus.sourceHtmlSha256, 'snapshot');
  check(JSON.stringify(data.coverage.map(r => r.paragraphId)) === JSON.stringify(corpus.paragraphs.map(p => p.id)), 'coverage order/completeness');
  for (const record of data.coverage) {
    const p = paragraphs.get(record.paragraphId);
    check(record.sourceSha256 === p?.sha256 && p?.sha256 === hash(p.text), `coverage hash ${record.paragraphId}`);
    check(['retain', 'adapt', 'context'].includes(record.disposition), `whole omission ${record.paragraphId}`);
    check(Boolean(record.reviewInstruction?.trim()), `review instruction ${record.paragraphId}`);
    check(record.conceptIds.length > 0 && record.conceptIds.every(id => englishConcepts.some(c => c.id === id)), `coverage concepts ${record.paragraphId}`);
    check(typeof record.optionalFaithPremise === 'boolean', `premise placement ${record.paragraphId}`);
    for (const q of record.necessaryQualifications) {
      check(q.kind === 'editorial-instruction' && q.sourceRefs.includes(record.paragraphId), `qualification ${record.paragraphId}`);
    }
  }
  check(JSON.stringify(data.terms.map(t => t.conceptId)) === JSON.stringify(englishConcepts.map(c => c.id)), 'concept identities');
  const labels = new Set(data.relationLabels.map(l => l.type));
  check(labels.size === relationTypes.size && [...relationTypes].every(t => labels.has(t)), 'relation labels');
  const quotes = [
    ...data.terms.map(t => t.anchor), ...data.relationLabels.map(r => r.anchor),
    ...data.exclusions.flatMap(e => [e.sourceSpan, e.reviewContext]),
    ...data.protectedSpans.map(p => p.sourceSpan),
    ...data.faithPremises.map(p => p.reviewContext),
  ];
  for (const q of quotes) {
    const p = paragraphs.get(q.paragraphId);
    check(q.kind === 'quotation' && Number.isInteger(q.start) && Number.isInteger(q.end) && q.start >= 0 && q.end > q.start && q.end <= (p?.text.length ?? 0), 'span coordinates');
    check(p?.text.slice(q.start, q.end) === q.text, `contiguous Spanish span ${q.paragraphId}`);
    check(q.sourceSha256 === p?.sha256 && q.sha256 === hash(q.text), `span hashes ${q.paragraphId}`);
  }
  for (const t of data.terms) check(t.sourceRefs.includes(t.anchor.paragraphId) && t.sourceRefs.every(id => paragraphs.has(id)), `term refs ${t.conceptId}`);
  const optionalIds = data.coverage.filter(r => r.optionalFaithPremise).map(r => r.paragraphId);
  check(JSON.stringify(data.faithPremises.map(p => p.paragraphId)) === JSON.stringify(optionalIds), 'faith premise completeness');
  for (const p of data.faithPremises) {
    check(p.placement === 'optional-foundations' && p.paragraphId === p.reviewContext.paragraphId && p.reviewContext.text === paragraphs.get(p.paragraphId)?.text, 'complete premise review context');
    check(p.instructions.every(i => i.kind === 'source-annotation' && i.sourceRefs.includes(p.paragraphId)), 'premise attribution');
  }
  for (const e of data.exclusions) {
    check(e.sourceSpan.paragraphId === e.reviewContext.paragraphId && e.reviewContext.text === paragraphs.get(e.sourceSpan.paragraphId)?.text, 'complete exclusion context');
    check(e.preserve.trim().length > 40, 'exclusion preservation instruction');
    check(!data.protectedSpans.some(p => intersects(e.sourceSpan, p.sourceSpan)), 'protected/excluded overlap');
    check(!e.matchScope || e.matchScope === 'global' || (e.matchScope === 'source-location' && e.scope === 'clause' && e.matchScopeReview?.length > 80), 'reviewed matching scope');
  }
  check(data.exclusions.length === 18 && new Set(data.exclusions.map(e => e.id)).size === 18, 'intentional exclusions');
  check(JSON.stringify(data.notes.map(n => n.noteId)) === JSON.stringify(corpus.footnotes.map(n => n.id)), 'note mapping completeness');
  for (const n of data.notes) {
    const source = corpus.footnotes.find(s => s.id === n.noteId);
    const mapping = sourceAlignment.notes.find(s => s.noteId === n.noteId);
    check(n.englishNoteId === mapping?.englishNoteId && n.mapping === 'same-number-reviewed', `note identity ${n.noteId}`);
    check(n.sourceSha256 === source?.sha256 && source?.sha256 === hash(source.text), `note hash ${n.noteId}`);
    check(JSON.stringify(n.paragraphIds) === JSON.stringify(source?.paragraphIds), `note backlinks ${n.noteId}`);
    check(n.sourceMarker === source?.sourceMarker, `note marker ${n.noteId}`);
    if (n.previousNoteId) check(n.previousNoteId === corpus.footnotes[source.number - 2]?.id, `preceding citation ${n.noteId}`);
    check(Boolean(n.previousNoteId) === /^(?:Cf\. )?ibíd\./i.test(source.text), `preceding citation presence ${n.noteId}`);
    check(n.screen === (['n132', 'n174', 'n175', 'n182'].includes(n.noteId) ? 'argument-and-citation' : 'bibliographic'), `local note screen ${n.noteId}`);
  }
  return errors;
}

const protectedText = id => review.protectedSpans.filter(p => p.sourceSpan.paragraphId === id).map(p => p.sourceSpan.text).join(' ');

test('Spanish alignment binds 245 decisions, 27 terms, nine relation types and local optional contexts', () => {
  assert.deepEqual(alignmentErrors(review), []);
  assert.equal(review.coverage.filter(r => r.disposition === 'context').length, 42);
  assert.equal(review.protectedSpans.length, 64);
  assert.equal(review.faithPremises.length, 81);
  assert.match(review.method, /not public reading copy or native-speaker proofreading/);
  assert.equal(review.terms.find(t => t.conceptId === 'dignity').anchor.text, 'dignidad ontológica');
  assert.match(review.terms.find(t => t.conceptId === 'ai-limits').review, /Use IA/);
  assert.equal(review.terms.find(t => t.conceptId === 'institutional-accountability').label, 'Rendición de cuentas');
});

test('Spanish note mapping independently screens 224 local notes and preceding citations', () => {
  assert.equal(review.notes.length, 224);
  assert.deepEqual(review.notes.filter(n => n.screen === 'argument-and-citation').map(n => n.noteId), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(review.notes[142].screen, 'bibliographic');
  assert.equal(corpus.footnotes[142].text, 'H. Arendt, Los orígenes del totalitarismo, Madrid 2014, 634.');
  assert.equal(review.notes[123].sourceMarker, '[124]');
  assert.equal(review.notes[203].previousNoteId, 'n203');
  assert.equal(review.notes[210].previousNoteId, 'n210');
  for (const n of corpus.footnotes) {
    const dependent = /^(?:Cf\. )?ibíd\./i.test(n.text);
    assert.equal(Boolean(review.notes[n.number - 1].previousNoteId), dependent, n.id);
  }
  const missing = structuredClone(review);
  missing.notes.splice(123, 1);
  assert.ok(alignmentErrors(missing).includes('note mapping completeness'));
  const bad = structuredClone(review);
  bad.notes[203].previousNoteId = 'n202';
  bad.notes[123].sourceMarker = '[ 124]';
  assert.ok(alignmentErrors(bad).includes('preceding citation n204'));
  assert.ok(alignmentErrors(bad).includes('note marker n124'));
  bad.notes[142].screen = 'argument-and-citation';
  delete bad.notes[210].previousNoteId;
  assert.ok(alignmentErrors(bad).includes('local note screen n143'));
  assert.ok(alignmentErrors(bad).includes('preceding citation presence n211'));
});

test('Spanish alignment rejects foreign offsets, splicing, fabricated text and stale hashes', () => {
  const foreign = structuredClone(review);
  foreign.terms[0].anchor.start = 693; // German coordinate is not a Spanish source coordinate.
  assert.ok(alignmentErrors(foreign).some(e => e.includes('contiguous Spanish span')));
  const spliced = structuredClone(review);
  const q = spliced.protectedSpans[0].sourceSpan;
  q.text = q.text.slice(0, 10) + q.text.slice(-10);
  q.sha256 = hash(q.text);
  assert.ok(alignmentErrors(spliced).some(e => e.includes('contiguous Spanish span')));
  const stale = structuredClone(review);
  stale.sourceHtmlSha256 = '0'.repeat(64);
  stale.coverage[243].sourceSha256 = '0'.repeat(64);
  assert.ok(alignmentErrors(stale).includes('snapshot'));
  assert.ok(alignmentErrors(stale).includes('coverage hash p244'));
});

test('Spanish coverage rejects missing paragraphs, whole omissions and scope weakening', () => {
  const missing = structuredClone(review);
  missing.coverage.pop();
  assert.ok(alignmentErrors(missing).includes('coverage order/completeness'));
  const changed = structuredClone(review);
  changed.coverage[243].disposition = 'omit-devotional';
  changed.exclusions[0].matchScope = 'source-location';
  assert.ok(alignmentErrors(changed).includes('whole omission p244'));
  assert.ok(alignmentErrors(changed).includes('reviewed matching scope'));
  assert.deepEqual(review.exclusions.filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'oración y']]);
});

test('Spanish exclusions preserve institutional criticism, practical peace and concluding subjects', () => {
  const changed = structuredClone(review);
  changed.exclusions[0].sourceSpan = structuredClone(review.protectedSpans.find(p => p.sourceSpan.paragraphId === 'p176').sourceSpan);
  assert.ok(alignmentErrors(changed).includes('protected/excluded overlap'));
  assert.match(protectedText('p176'), /instituciones eclesiásticas tuvieron esclavos/);
  assert.match(protectedText('p176'), /regular y legitimar/);
  assert.match(protectedText('p176'), /en nombre de la Iglesia, pido sinceramente perdón/);
  assert.ok(!review.exclusions.some(e => e.sourceSpan.paragraphId === 'p176'));
  assert.match(protectedText('p244'), /viuda.*huérfano.*extranjero.*niño herido.*exiliado.*fugitivo/);
  assert.match(protectedText('p245'), /compartiendo lo que somos y lo que tenemos/);
  assert.equal(review.exclusions.filter(e => e.sourceSpan.paragraphId === 'p228').length, 3);
  assert.match(protectedText('p228'), /comprometernos a hacerla realidad/);
  assert.match(protectedText('p243'), /romanos que dominan su tierra/);
});

test('Spanish protected qualifications retain dignity, care, public support and military constraints', () => {
  assert.match(protectedText('p052'), /ningún pecado.*ninguna exclusión/);
  assert.match(protectedText('p055'), /concepción.*fin natural.*aborto.*eutanasia/);
  assert.match(protectedText('p066'), /derecho a la propiedad privada.*subordinado/);
  assert.match(review.coverage.find(r => r.paragraphId === 'p067').reviewInstruction, /estafa.*fraud/);
  assert.match(protectedText('p069'), /no justifica el desinterés del Estado/);
  assert.match(protectedText('p099'), /beneficios concretos.*conciencia moral/);
  assert.match(protectedText('p118'), /necesario tratar de eliminar el sufrimiento/);
  assert.match(protectedText('p154'), /falta de empleo no menoscabe la participación social/);
  assert.match(protectedText('p165'), /un hombre y una mujer/);
  assert.match(protectedText('p192'), /sentido más estricto/);
  assert.match(protectedText('p197'), /último recurso.*legítima defensa/);
  assert.match(protectedText('p198'), /decisiones letales.*irreversibles.*valores y un juicio prudente.*ecosistema moral.*conciencia.*límites adecuados/);
  assert.match(protectedText('p199'), /combatientes y no combatientes/);
  assert.match(protectedText('p200'), /control humano efectivo, consciente y responsable/);
  assert.match(review.coverage.find(r => r.paragraphId === 'p143').necessaryQualifications[0].text, /parents.*primary and inalienable/i);
});
