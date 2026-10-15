import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relationTypes } from '../scripts/validate-editorial.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const corpus = read('content/source/pt/corpus.json');
const review = read('content/editorial/pt/alignment-review.json');
const sourceAlignment = read('content/source/pt/alignment.json');
const englishConcepts = read('content/editorial/concepts.json').concepts;
const paragraphs = new Map(corpus.paragraphs.map(p => [p.id, p]));
const hash = text => createHash('sha256').update(text).digest('hex');
const intersects = (a, b) => a.paragraphId === b.paragraphId && a.start < b.end && b.start < a.end;

// Internal authoring evidence: this contract does not enable publication or
// establish semantic fidelity. L7.2/L7.3 require independent content/UI gates.
function alignmentErrors(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(data.locale === 'pt' && data.editionId === corpus.editionId, 'edition');
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
    check(p?.text.slice(q.start, q.end) === q.text, `contiguous Portuguese span ${q.paragraphId}`);
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
    check(Boolean(n.previousNoteId) === /^(?:Cf\. )?ibid(?:em)?\b/i.test(source.text), `preceding citation presence ${n.noteId}`);
    check(n.screen === (['n132', 'n174', 'n175', 'n182'].includes(n.noteId) ? 'argument-and-citation' : 'bibliographic'), `local note screen ${n.noteId}`);
  }
  return errors;
}

const protectedText = id => review.protectedSpans.filter(p => p.sourceSpan.paragraphId === id).map(p => p.sourceSpan.text).join(' ');

test('Portuguese alignment binds local terms, paragraph coverage and exact source spans', () => {
  assert.deepEqual(alignmentErrors(review), []);
  assert.equal(review.coverage.filter(r => r.disposition === 'context').length, 42);
  assert.equal(review.protectedSpans.length, 70);
  assert.equal(review.faithPremises.length, 81);
  assert.match(review.method, /not public reading copy or native-speaker proofreading/);
  assert.equal(review.terms.find(t => t.conceptId === 'dignity').anchor.text, 'dignidade ontológica');
  assert.equal(review.terms.find(t => t.conceptId === 'institutional-accountability').label, 'Responsabilização');
  assert.equal(review.terms.find(t => t.conceptId === 'institutional-accountability').anchor.text, 'responsabilização');
  assert.match(review.coverage[66].reviewInstruction, /desperdícios.*pilhagem/);
  assert.match(review.coverage[117].necessaryQualifications[0].text, /duty.*try to eliminate suffering/);
  assert.equal(review.terms.find(t => t.conceptId === 'subsidiarity').label, 'Subsidiariedade');
  for (const l of review.relationLabels) assert.equal(l.kind, 'editorial-interpretation');
});

test('Portuguese notes preserve every local mapping, argument and preceding-work dependency', () => {
  assert.equal(review.notes.length, 224);
  assert.deepEqual(review.notes.filter(n => n.screen === 'argument-and-citation').map(n => n.noteId), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(review.notes[142].screen, 'bibliographic');
  assert.equal(corpus.footnotes[142].text, 'H. Arendt, As Origens do Totalitarismo (Alfragide 2024), 627.');
  assert.equal(review.notes[6].previousNoteId, 'n006'); // bare Ibidem
  assert.equal(review.notes[203].previousNoteId, 'n203');
  assert.equal(review.notes[206].previousNoteId, 'n206'); // Cf. ibidem
  assert.equal(review.notes[210].previousNoteId, 'n210');
  assert.equal(review.notes[123].sourceMarker, '[124]');
  for (const n of corpus.footnotes) assert.equal(Boolean(review.notes[n.number - 1].previousNoteId), /^(?:Cf\. )?ibid(?:em)?\b/i.test(n.text), n.id);
  const bad = structuredClone(review);
  bad.notes[203].previousNoteId = 'n202';
  bad.notes[123].sourceMarker = '[ 124]';
  bad.notes[142].screen = 'argument-and-citation';
  delete bad.notes[206].previousNoteId;
  assert.ok(alignmentErrors(bad).includes('preceding citation n204'));
  assert.ok(alignmentErrors(bad).includes('note marker n124'));
  assert.ok(alignmentErrors(bad).includes('local note screen n143'));
  assert.ok(alignmentErrors(bad).includes('preceding citation presence n207'));
  const missing = structuredClone(review);
  missing.notes.splice(123, 1);
  assert.ok(alignmentErrors(missing).includes('note mapping completeness'));
});

test('Portuguese spans reject foreign offsets, spliced text and stale source bindings', () => {
  const foreign = structuredClone(review);
  foreign.terms[0].anchor.start = 712; // French coordinate is not Portuguese provenance.
  assert.ok(alignmentErrors(foreign).some(e => e.includes('contiguous Portuguese span')));
  const spliced = structuredClone(review);
  const q = spliced.protectedSpans[0].sourceSpan;
  q.text = q.text.slice(0, 10) + q.text.slice(-10);
  q.sha256 = hash(q.text);
  assert.ok(alignmentErrors(spliced).some(e => e.includes('contiguous Portuguese span')));
  const stale = structuredClone(review);
  stale.sourceHtmlSha256 = '0'.repeat(64);
  stale.coverage[243].sourceSha256 = '0'.repeat(64);
  assert.ok(alignmentErrors(stale).includes('snapshot'));
  assert.ok(alignmentErrors(stale).includes('coverage hash p244'));
});

test('Portuguese mixed exclusions preserve thought and keep complete forms global', () => {
  const missing = structuredClone(review);
  missing.coverage.pop();
  assert.ok(alignmentErrors(missing).includes('coverage order/completeness'));
  const changed = structuredClone(review);
  changed.coverage[243].disposition = 'omit-devotional';
  changed.exclusions[0].matchScope = 'source-location';
  assert.ok(alignmentErrors(changed).includes('whole omission p244'));
  assert.ok(alignmentErrors(changed).includes('reviewed matching scope'));
  assert.deepEqual(review.exclusions.filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'oração e']]);
  changed.exclusions[0].sourceSpan = structuredClone(review.protectedSpans.find(p => p.sourceSpan.paragraphId === 'p176').sourceSpan);
  assert.ok(alignmentErrors(changed).includes('protected/excluded overlap'));
  assert.equal(review.exclusions.filter(e => e.sourceSpan.paragraphId === 'p228').length, 3);
  assert.ok(!review.exclusions.some(e => ['p008', 'p121', 'p125', 'p148', 'p176'].includes(e.sourceSpan.paragraphId)));
});

test('Portuguese protected argument keeps Church criticism and concrete concluding subjects', () => {
  assert.match(protectedText('p176'), /não podemos negar ou minimizar o atraso/);
  assert.match(protectedText('p176'), /instituições eclesiásticas tinham escravos/);
  assert.match(protectedText('p176'), /regular e legitimar/);
  assert.match(protectedText('p176'), /em nome da Igreja, peço sinceramente perdão/);
  assert.match(protectedText('p089'), /espirituais, económicos, institucionais, sexuais, de poder e de consciência/);
  assert.match(protectedText('p138'), /jornalistas.*injustiças e abusos.*não devemos aguardar/);
  assert.match(protectedText('p244'), /viúva.*órfão.*estrangeiro.*criança ferida.*exilado.*fugitivo/);
  assert.match(protectedText('p245'), /partilhando o que somos e o que temos/);
  assert.match(protectedText('p228'), /nos empenharmos para a concretizar/);
  assert.match(protectedText('p243'), /romanos a dominarem a sua terra/);
  assert.match(protectedText('p236'), /sem nos refugiarmos no espiritualismo/);
  assert.match(protectedText('p239'), /visita a quem está só, o serviço aos pobres/);
  assert.match(protectedText('p240'), /condições de trabalho escondidas/);
});

test('Portuguese protected qualifications keep dignity, care, rights, support and military prudence', () => {
  assert.match(protectedText('p052'), /Estas dimensões.*aumentar ou diminuir.*nenhum pecado.*nenhuma exclusão/);
  assert.match(protectedText('p055'), /concepção.*fim natural.*aborto.*eutanásia/);
  assert.match(protectedText('p066'), /direito à propriedade privada.*subordinado/);
  assert.match(protectedText('p067'), /desperdícios.*pilhagem/);
  assert.match(protectedText('p069'), /não justifica o não envolvimento do Estado/);
  assert.match(protectedText('p099'), /benefícios concretos.*consciência moral/);
  assert.match(protectedText('p118'), /nosso dever procurar eliminar o sofrimento/);
  assert.match(protectedText('p143'), /direito fundamental e inalienável.*morais, culturais e religiosas/);
  assert.match(protectedText('p154'), /falta de emprego não prejudique a participação social/);
  assert.match(protectedText('p165'), /um homem e uma mulher/);
  assert.match(protectedText('p192'), /sentido mais estrito/);
  assert.match(protectedText('p197'), /última alternativa.*legítima defesa/);
  assert.match(protectedText('p198'), /decisões letais.*irreversíveis.*valores e prudência.*ecossistema moral.*consciência.*limites apropriados/);
  assert.match(protectedText('p199'), /responsabilidades.*identificável e verificável.*rapidez e a eficiência.*combatentes e não combatentes/);
  assert.match(protectedText('p200'), /controle humano efetivo, consciente e responsável/);
});

test('Portuguese edition witnesses preserve local anomalies and substantive notes', () => {
  assert.match(paragraphs.get('p002').text, /diálogo diálogo/);
  assert.match(paragraphs.get('p043').text, /ecologia integral «o clamor da terra»/);
  assert.match(paragraphs.get('p123').text, /Nações Unidas\(1945\)/);
  assert.match(paragraphs.get('p132').text, /tem uma dimensão racional; uma vez que requer averiguação/);
  assert.match(paragraphs.get('p169').text, /trabalho, benefícios e descanso/);
  assert.match(paragraphs.get('p234').text, /1 Cor 12, 27/);
  assert.match(corpus.footnotes[88].text, /AAS 107 \(2015\)/);
  assert.match(corpus.footnotes[212].text, /Deus caritas est \(29 de junho de 2005\).*AAS 101 \(2006\)/);
  assert.match(corpus.footnotes[173].text, /exigências políticas.*relativizando/);
  assert.match(corpus.footnotes[174].text, /1866.*sem a condenar plenamente/);
  assert.match(corpus.footnotes[181].text, /preventivos/);
  for (const id of ['n089', 'n143', 'n175', 'n182', 'n213', 'n217']) assert.ok(review.editionDifferences.some(r => r.noteId === id));
});
