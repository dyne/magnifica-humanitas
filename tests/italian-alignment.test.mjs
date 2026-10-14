import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relationTypes } from '../scripts/validate-editorial.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const corpus = read('content/source/it/corpus.json');
const review = read('content/editorial/it/alignment-review.json');
const englishConcepts = read('content/editorial/concepts.json').concepts;
const englishRelations = read('content/editorial/relations.json').relations;
const paragraphs = new Map(corpus.paragraphs.map(p => [p.id, p]));
const hash = text => createHash('sha256').update(text).digest('hex');
const intersects = (a, b) => a.paragraphId === b.paragraphId && a.start < b.end && b.start < a.end;

// This is a review-evidence contract, not proof of translation quality. Keep it
// independent of publication gates: incomplete Italian must remain unavailable.
function alignmentErrors(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(data.locale === 'it' && data.editionId === corpus.editionId, 'edition');
  check(data.sourceHtmlSha256 === corpus.sourceHtmlSha256, 'snapshot');
  const orderedIds = corpus.paragraphs.map(p => p.id);
  check(JSON.stringify(data.coverage.map(r => r.paragraphId)) === JSON.stringify(orderedIds), 'coverage order/completeness');
  for (const record of data.coverage) {
    const p = paragraphs.get(record.paragraphId);
    check(record.sourceSha256 === p?.sha256 && p?.sha256 === hash(p.text), `coverage hash ${record.paragraphId}`);
    check(['retain', 'adapt', 'context'].includes(record.disposition), `whole omission ${record.paragraphId}`);
    check(Boolean(record.reviewInstruction?.trim()), `review instruction ${record.paragraphId}`);
    check(record.conceptIds.length > 0 && record.conceptIds.every(id => englishConcepts.some(c => c.id === id)), `coverage concepts ${record.paragraphId}`);
    for (const instruction of record.necessaryQualifications) {
      check(instruction.kind === 'editorial-instruction' && instruction.sourceRefs.includes(record.paragraphId), `qualification ${record.paragraphId}`);
    }
  }
  check(JSON.stringify(data.terms.map(t => t.conceptId)) === JSON.stringify(englishConcepts.map(c => c.id)), 'concept identities');
  const labels = new Set(data.relationLabels.map(l => l.type));
  check(labels.size === relationTypes.size && [...relationTypes].every(t => labels.has(t)), 'relation labels');
  check(englishRelations.every(r => labels.has(r.type)), 'relation label reachability');
  const quotes = [
    ...data.terms.map(t => t.anchor), ...data.relationLabels.map(r => r.anchor),
    ...data.exclusions.flatMap(e => [e.sourceSpan, e.reviewContext]),
    ...data.protectedSpans.map(p => p.sourceSpan),
  ];
  for (const q of quotes) {
    const p = paragraphs.get(q.paragraphId);
    check(q.kind === 'quotation' && Number.isInteger(q.start) && Number.isInteger(q.end) && q.start >= 0 && q.end > q.start && q.end <= (p?.text.length ?? 0), 'span coordinates');
    check(p?.text.slice(q.start, q.end) === q.text, `contiguous Italian span ${q.paragraphId}`);
    check(q.sourceSha256 === p?.sha256 && q.sha256 === hash(q.text), `span hashes ${q.paragraphId}`);
  }
  for (const t of data.terms) check(t.sourceRefs.includes(t.anchor.paragraphId) && t.sourceRefs.every(id => paragraphs.has(id)), `term refs ${t.conceptId}`);
  for (const e of data.exclusions) {
    check(e.sourceSpan.paragraphId === e.reviewContext.paragraphId && e.reviewContext.start <= e.sourceSpan.start && e.reviewContext.end >= e.sourceSpan.end, 'exclusion context');
    check(e.preserve.trim().length > 40, 'exclusion preservation instruction');
    check(!data.protectedSpans.some(p => intersects(e.sourceSpan, p.sourceSpan)), 'protected/excluded overlap');
  }
  check(data.exclusions.length === 18 && new Set(data.exclusions.map(e => e.id)).size === 18, 'intentional exclusions');
  check(JSON.stringify(data.notes.map(n => n.noteId)) === JSON.stringify(corpus.footnotes.map(n => n.id)), 'note mapping completeness');
  for (const n of data.notes) {
    const source = corpus.footnotes.find(s => s.id === n.noteId);
    check(n.englishNoteId === n.noteId && n.mapping === 'same-number-reviewed', `note identity ${n.noteId}`);
    check(n.sourceSha256 === source?.sha256 && source?.sha256 === hash(source.text), `note hash ${n.noteId}`);
    check(JSON.stringify(n.paragraphIds) === JSON.stringify(source?.paragraphIds), `note backlinks ${n.noteId}`);
    check(n.sourceMarker === source?.sourceMarker, `note marker ${n.noteId}`);
    if (n.previousNoteId) check(n.previousNoteId === corpus.footnotes[source.number - 2]?.id, `preceding citation ${n.noteId}`);
  }
  return errors;
}

test('Italian source alignment binds all 245 decisions, 27 terms and nine relation types to the official edition', () => {
  assert.deepEqual(alignmentErrors(review), []);
  assert.equal(review.coverage.filter(r => r.disposition === 'context').length, 42);
  assert.equal(review.protectedSpans.length, 64);
  assert.match(review.method, /not public reading copy or native-speaker proofreading/);
});

test('Italian note correspondence preserves all 224 identities, local markers and preceding bibliographic context', () => {
  assert.equal(review.notes.length, 224);
  assert.equal(review.notes[123].sourceMarker, '[ 124]');
  assert.deepEqual(review.notes[123].paragraphIds, ['p101']);
  assert.equal(review.notes[210].previousNoteId, 'n210');
  const missing = structuredClone(review);
  missing.notes.splice(123, 1);
  assert.ok(alignmentErrors(missing).includes('note mapping completeness'));
});

test('Italian alignment rejects English offsets, fabricated and spliced quotation text', () => {
  const changed = structuredClone(review);
  changed.terms[0].anchor.start = 457; // English §52 coordinate is not Italian authority.
  assert.ok(alignmentErrors(changed).some(e => e.includes('contiguous Italian span')));
  const spliced = structuredClone(review);
  const q = spliced.protectedSpans[0].sourceSpan;
  q.text = q.text.slice(0, 10) + q.text.slice(-10);
  q.sha256 = hash(q.text);
  assert.ok(alignmentErrors(spliced).some(e => e.includes('contiguous Italian span')));
});

test('Italian alignment rejects missing coverage, stale source hashes and whole devotional omissions', () => {
  const missing = structuredClone(review);
  missing.coverage.pop();
  assert.ok(alignmentErrors(missing).includes('coverage order/completeness'));
  const changed = structuredClone(review);
  changed.coverage[243].disposition = 'omit-devotional';
  changed.coverage[243].sourceSha256 = '0'.repeat(64);
  assert.ok(alignmentErrors(changed).includes('whole omission p244'));
  assert.ok(alignmentErrors(changed).includes('coverage hash p244'));
});

test('Italian devotional exclusions cannot erase an exact protected claim', () => {
  const changed = structuredClone(review);
  changed.exclusions[0].sourceSpan = structuredClone(changed.protectedSpans.find(p => p.sourceSpan.paragraphId === 'p176').sourceSpan);
  assert.ok(alignmentErrors(changed).includes('protected/excluded overlap'));
  const p176 = review.protectedSpans.filter(p => p.sourceSpan.paragraphId === 'p176').map(p => p.sourceSpan.text).join(' ');
  assert.match(p176, /istituzioni ecclesiastiche avevano schiavi/);
  assert.match(p176, /regolare e legittimare/);
  assert.match(p176, /domando sinceramente perdono/);
  assert.ok(!review.exclusions.some(e => e.sourceSpan.paragraphId === 'p176'));
});

test('Italian qualifications protect care, rights, family, civilian safeguards and the practical conclusion', () => {
  const protectedText = id => review.protectedSpans.filter(p => p.sourceSpan.paragraphId === id).map(p => p.sourceSpan.text).join(' ');
  assert.match(protectedText('p055'), /concepimento/);
  assert.match(protectedText('p055'), /aborto provocato.*eutanasia/);
  assert.match(protectedText('p118'), /doveroso.*eliminare la sofferenza/);
  assert.match(protectedText('p165'), /un uomo e una donna/);
  assert.match(protectedText('p197'), /ultima risorsa.*legittima difesa/);
  assert.match(protectedText('p198'), /decisioni letali o comunque irreversibili.*valori e giudizio prudente/);
  assert.match(protectedText('p199'), /combattenti e non combattenti/);
  assert.match(protectedText('p200'), /effettivo, consapevole e responsabile/);
  assert.match(protectedText('p244'), /vedova.*orfano.*straniero.*bambino ferito.*esule.*fuggiasco/);
  assert.match(protectedText('p245'), /condividendo/);
  assert.equal(review.exclusions.filter(e => e.sourceSpan.paragraphId === 'p228').length, 3);
  assert.match(protectedText('p228'), /impegnarci per realizzarla/);
});
