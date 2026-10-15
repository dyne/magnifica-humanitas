import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relationTypes } from '../scripts/validate-editorial.mjs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const corpus = read('content/source/pl/corpus.json');
const review = read('content/editorial/pl/alignment-review.json');
const sourceAlignment = read('content/source/pl/alignment.json');
const concepts = read('content/editorial/concepts.json').concepts;
const paragraphs = new Map(corpus.paragraphs.map(p => [p.id, p]));
const hash = text => createHash('sha256').update(text).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const intersects = (a, b) => a.paragraphId === b.paragraphId && a.start < b.end && b.start < a.end;
const precedingKind = text => /^(?:Por\. )?tamże\b/iu.test(text) ? 'same-work'
  : /^(?:Por\. )?Tenże\b/iu.test(text) ? 'same-author' : undefined;

// Internal source-comparison evidence, not a publication flag or proof of
// semantic fidelity. L8.2 and L8.3 retain independent reading/interface gates.
function alignmentErrors(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(data.locale === 'pl' && data.editionId === corpus.editionId, 'edition');
  check(data.sourceHtmlSha256 === corpus.sourceHtmlSha256, 'snapshot');
  check(equal(data.coverage.map(r => r.paragraphId), corpus.paragraphs.map(p => p.id)), 'coverage order/completeness');
  check(new Set(data.coverage.map(r => r.reviewInstruction)).size === 245, 'individual review instructions');
  for (const record of data.coverage) {
    const p = paragraphs.get(record.paragraphId);
    check(record.sourceSha256 === p?.sha256 && p?.sha256 === hash(p.text), `coverage hash ${record.paragraphId}`);
    check(['retain', 'adapt', 'context'].includes(record.disposition), `whole omission ${record.paragraphId}`);
    check(Boolean(record.reviewInstruction?.trim()), `review instruction ${record.paragraphId}`);
    check(record.conceptIds.length > 0 && record.conceptIds.every(id => concepts.some(c => c.id === id)), `coverage concepts ${record.paragraphId}`);
    check(typeof record.optionalFaithPremise === 'boolean', `premise placement ${record.paragraphId}`);
    for (const q of record.necessaryQualifications) {
      check(q.kind === 'editorial-instruction' && q.sourceRefs.includes(record.paragraphId) && q.sourceRefs.every(id => paragraphs.has(id)), `qualification ${record.paragraphId}`);
    }
  }
  check(equal(data.terms.map(t => t.conceptId), concepts.map(c => c.id)), 'concept identities');
  const labels = new Set(data.relationLabels.map(l => l.type));
  check(data.relationLabels.length === relationTypes.size && labels.size === relationTypes.size && [...relationTypes].every(t => labels.has(t)), 'relation labels');
  for (const l of data.relationLabels) check(l.kind === 'editorial-interpretation' && Boolean(l.label.trim()), 'relation interpretation');
  const quotes = [
    ...data.terms.map(t => t.anchor), ...data.relationLabels.map(r => r.anchor),
    ...data.exclusions.flatMap(e => [e.sourceSpan, e.reviewContext]),
    ...data.protectedSpans.map(p => p.sourceSpan),
    ...data.faithPremises.map(p => p.reviewContext),
  ];
  for (const q of quotes) {
    const p = paragraphs.get(q.paragraphId);
    check(q.kind === 'quotation' && Number.isInteger(q.start) && Number.isInteger(q.end) && q.start >= 0 && q.end > q.start && q.end <= (p?.text.length ?? 0), 'span coordinates');
    check(p?.text.slice(q.start, q.end) === q.text, `contiguous Polish span ${q.paragraphId}`);
    check(q.sourceSha256 === p?.sha256 && q.sha256 === hash(q.text), `span hashes ${q.paragraphId}`);
  }
  for (const t of data.terms) check(t.sourceRefs.includes(t.anchor.paragraphId) && t.sourceRefs.every(id => paragraphs.has(id)) && Boolean(t.label.trim()), `term refs ${t.conceptId}`);
  check(equal(data.faithPremises.map(p => p.paragraphId), data.coverage.filter(r => r.optionalFaithPremise).map(r => r.paragraphId)), 'faith premise completeness');
  for (const p of data.faithPremises) {
    check(p.placement === 'optional-foundations' && p.paragraphId === p.reviewContext.paragraphId && p.reviewContext.text === paragraphs.get(p.paragraphId)?.text, 'complete premise review context');
    check(p.instructions.length > 0 && p.instructions.every(i => i.kind === 'source-annotation' && i.sourceRefs.includes(p.paragraphId)), 'premise attribution');
  }
  for (const e of data.exclusions) {
    check(e.sourceSpan.paragraphId === e.reviewContext.paragraphId && e.reviewContext.text === paragraphs.get(e.sourceSpan.paragraphId)?.text, 'complete exclusion context');
    check(e.preserve.trim().length > 40, 'exclusion preservation instruction');
    check(!data.protectedSpans.some(p => intersects(e.sourceSpan, p.sourceSpan)), 'protected/excluded overlap');
    check(!e.matchScope || e.matchScope === 'global' || (e.matchScope === 'source-location' && e.scope === 'clause' && e.matchScopeReview?.length > 80), 'reviewed matching scope');
  }
  check(data.exclusions.length === 18 && new Set(data.exclusions.map(e => e.id)).size === 18, 'intentional exclusions');
  check(equal(data.notes.map(n => n.noteId), corpus.footnotes.map(n => n.id)), 'note mapping completeness');
  for (const n of data.notes) {
    const source = corpus.footnotes.find(s => s.id === n.noteId);
    const mapping = sourceAlignment.notes.find(s => s.noteId === n.noteId);
    check(n.englishNoteId === mapping?.englishNoteId && n.mapping === 'same-number-reviewed', `note identity ${n.noteId}`);
    check(n.sourceSha256 === source?.sha256 && source?.sha256 === hash(source.text), `note hash ${n.noteId}`);
    check(equal(n.paragraphIds, source?.paragraphIds), `note backlinks ${n.noteId}`);
    check(n.sourceMarker === source?.sourceMarker, `note marker ${n.noteId}`);
    check(equal(n.sourceLinks, source?.sourceLinks), `official links ${n.noteId}`);
    if (n.previousNoteId) check(n.previousNoteId === corpus.footnotes[source.number - 2]?.id, `preceding citation ${n.noteId}`);
    check(Boolean(n.previousNoteId) === Boolean(precedingKind(source.text)) && n.previousReferenceKind === precedingKind(source.text), `preceding citation presence/kind ${n.noteId}`);
    check(n.screen === (['n132', 'n174', 'n175', 'n182'].includes(n.noteId) ? 'argument-and-citation' : 'bibliographic'), `local note screen ${n.noteId}`);
  }
  return errors;
}

const protectedText = id => review.protectedSpans.filter(p => p.sourceSpan.paragraphId === id).map(p => p.sourceSpan.text).join(' ');

test('Polish alignment binds local terms, complete individual coverage and exact spans', () => {
  assert.deepEqual(alignmentErrors(review), []);
  assert.equal(review.coverage.filter(r => r.disposition === 'context').length, 42);
  assert.equal(review.protectedSpans.length, 70);
  assert.equal(review.faithPremises.length, 84);
  assert.equal(review.coverage.reduce((n, p) => n + p.necessaryQualifications.length, 0), 115);
  assert.match(review.method, /not public reading copy or native-speaker proofreading/);
  assert.equal(review.terms.find(t => t.conceptId === 'dignity').anchor.text, 'godność ontologiczna');
  assert.equal(review.terms.find(t => t.conceptId === 'subsidiarity').label, 'Pomocniczość');
  assert.equal(review.terms.find(t => t.conceptId === 'institutional-accountability').label, 'Rozliczalność');
  assert.equal(review.terms.find(t => t.conceptId === 'institutional-accountability').anchor.text, 'rozliczalności');
  assert.match(review.terms.find(t => t.conceptId === 'institutional-accountability').review, /accountability.*zdać sprawę/);
  assert.match(review.coverage[66].reviewInstruction, /marnotrawstwa.*grabieży/);
  assert.match(review.coverage[117].necessaryQualifications[0].text, /Polish source.*duty.*eliminate suffering/);
});

test('Polish notes distinguish same-work and same-author references without inventing note identities', () => {
  assert.equal(review.notes.length, 224);
  assert.deepEqual(review.notes.filter(n => n.screen === 'argument-and-citation').map(n => n.noteId), ['n132', 'n174', 'n175', 'n182']);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-work').length, 35);
  assert.equal(review.notes.filter(n => n.previousReferenceKind === 'same-author').length, 23);
  for (const id of ['n002', 'n007', 'n163', 'n204', 'n207', 'n211']) assert.equal(review.notes.find(n => n.noteId === id).previousReferenceKind, 'same-work');
  for (const id of ['n003', 'n033', 'n136', 'n202']) assert.equal(review.notes.find(n => n.noteId === id).previousReferenceKind, 'same-author');
  assert.equal(review.notes[216].previousNoteId, undefined); // §§11–14, not an abbreviation.
  assert.match(review.editionDifferences.find(r => r.noteId === 'n163').review, /closing Benedict/);
  assert.equal(review.notes[142].screen, 'bibliographic');
  assert.match(corpus.footnotes[142].text, /Korzenie totalitaryzmu.*Warszawa 1993.*510/);
  const bad = structuredClone(review);
  bad.notes[203].previousNoteId = 'n202';
  bad.notes[32].previousReferenceKind = 'same-work';
  bad.notes[142].screen = 'argument-and-citation';
  delete bad.notes[206].previousNoteId;
  assert.ok(alignmentErrors(bad).includes('preceding citation n204'));
  assert.ok(alignmentErrors(bad).includes('preceding citation presence/kind n033'));
  assert.ok(alignmentErrors(bad).includes('local note screen n143'));
  assert.ok(alignmentErrors(bad).includes('preceding citation presence/kind n207'));
  const missing = structuredClone(review);
  missing.notes.splice(32, 1);
  assert.ok(alignmentErrors(missing).includes('note mapping completeness'));
});

test('Polish official broken fragments remain evidence, not guessed local destinations', () => {
  assert.equal(review.notes[32].sourceLinks[0].name, '_ft33');
  assert.equal(review.notes[218].noteId, 'n219');
  assert.deepEqual(review.notes[218].paragraphIds, ['p237']);
  assert.equal(review.notes[218].sourceMarker, '[219]');
  assert.equal(review.notes[218].sourceLinks[0].name, '_ftn210');
  assert.equal(review.notes[218].sourceLinks[0].href, '#_ftnref210');
  const repaired = structuredClone(review);
  repaired.notes[32].sourceLinks[0].name = '_ftn33';
  repaired.notes[218].sourceLinks[0].name = '_ftn219';
  repaired.notes[218].sourceLinks[0].href = '#_ftnref219';
  assert.ok(alignmentErrors(repaired).includes('official links n033'));
  assert.ok(alignmentErrors(repaired).includes('official links n219'));
});

test('Polish evidence rejects foreign offsets, spliced text, dangling refs and stale bindings', () => {
  const foreign = structuredClone(review);
  foreign.terms[0].anchor.start = 635; // Portuguese coordinate, not Polish provenance.
  assert.ok(alignmentErrors(foreign).some(e => e.includes('contiguous Polish span')));
  const spliced = structuredClone(review);
  const q = spliced.protectedSpans[0].sourceSpan;
  q.text = q.text.slice(0, 10) + q.text.slice(-10);
  q.sha256 = hash(q.text);
  assert.ok(alignmentErrors(spliced).some(e => e.includes('contiguous Polish span')));
  const stale = structuredClone(review);
  stale.sourceHtmlSha256 = '0'.repeat(64);
  stale.coverage[243].sourceSha256 = '0'.repeat(64);
  stale.terms[0].sourceRefs.push('p999');
  assert.ok(alignmentErrors(stale).includes('snapshot'));
  assert.ok(alignmentErrors(stale).includes('coverage hash p244'));
  assert.ok(alignmentErrors(stale).includes('term refs dignity'));
  const labels = structuredClone(review);
  labels.relationLabels[0].type = 'unsupported';
  labels.relationLabels[1].kind = 'quotation';
  assert.ok(alignmentErrors(labels).includes('relation labels'));
  assert.ok(alignmentErrors(labels).includes('relation interpretation'));
});

test('Polish mixed exclusions retain complete contexts and protect substantive thought', () => {
  const missing = structuredClone(review);
  missing.coverage.pop();
  missing.faithPremises.splice(missing.faithPremises.findIndex(p => p.paragraphId === 'p074'), 1);
  assert.ok(alignmentErrors(missing).includes('coverage order/completeness'));
  assert.ok(alignmentErrors(missing).includes('faith premise completeness'));
  const changed = structuredClone(review);
  changed.coverage[243].disposition = 'omit-devotional';
  changed.exclusions[0].matchScope = 'source-location';
  assert.ok(alignmentErrors(changed).includes('whole omission p244'));
  assert.ok(alignmentErrors(changed).includes('reviewed matching scope'));
  assert.deepEqual(review.exclusions.filter(e => e.matchScope === 'source-location').map(e => [e.id, e.sourceSpan.text]), [['p241-exclusion-1', 'modlitwy i']]);
  changed.exclusions[0].sourceSpan = structuredClone(review.protectedSpans.find(p => p.sourceSpan.paragraphId === 'p176').sourceSpan);
  assert.ok(alignmentErrors(changed).includes('protected/excluded overlap'));
  assert.equal(review.exclusions.filter(e => e.sourceSpan.paragraphId === 'p228').length, 3);
  assert.ok(!review.exclusions.some(e => ['p008', 'p121', 'p125', 'p148', 'p176'].includes(e.sourceSpan.paragraphId)));
  for (const id of ['p013', 'p074', 'p090']) assert.ok(review.faithPremises.some(p => p.paragraphId === id));
});

test('Polish protected argument keeps Church criticism and every concluding subject', () => {
  assert.match(protectedText('p176'), /Nie możemy jednak zaprzeczać ani umniejszać opóźnienia/);
  assert.match(protectedText('p176'), /instytucji kościelnych posiadało niewolników/);
  assert.match(protectedText('p176'), /regulować i uprawomocniać/);
  assert.match(protectedText('p176'), /w imieniu Kościoła szczerze proszę o przebaczenie/);
  assert.match(protectedText('p089'), /duchowego, ekonomicznego, instytucjonalnego, seksualnego, nadużyć władzy i sumienia/);
  assert.match(protectedText('p138'), /dziennikarze.*niesprawiedliwości i wykorzystania.*nie wolno nam czekać/);
  assert.match(protectedText('p244'), /wdowy.*sieroty.*cudzoziemca.*poranionego dziecka.*wygnańca.*uciekiniera/);
  assert.match(protectedText('p245'), /dzieląc się tym, kim jesteśmy i co posiadamy/);
  assert.match(protectedText('p228'), /urzeczywistniać go w naszych relacjach i w społeczeństwie/);
  assert.match(protectedText('p243'), /Rzymianie nadal panują/);
  assert.match(protectedText('p236'), /nie uciekając się ani do spirytualizmu/);
  assert.match(protectedText('p239'), /samotnych.*biednym/);
  assert.match(protectedText('p240'), /warunki pracy ukryte/);
});

test('Polish qualifications keep dignity, care, property, parental rights and military prudence', () => {
  assert.match(protectedText('p052'), /wzrastać albo maleć.*żaden grzech.*żadne wykluczenie/);
  assert.match(protectedText('p055'), /poczęcia.*naturalnego kresu.*aborcji.*eutanazji/);
  assert.match(protectedText('p066'), /prawo do własności prywatnej.*podporządkowane/);
  assert.match(protectedText('p067'), /marnotrawstwa.*grabieży/);
  assert.match(protectedText('p069'), /nie usprawiedliwia.*wycofania się państwa/);
  assert.match(protectedText('p099'), /konkretne korzyści.*świadomości moralnej/);
  assert.match(protectedText('p118'), /obowiązkiem jest starać się usuwać cierpienie/);
  assert.match(protectedText('p143'), /pierwszorzędne i niezbywalne prawo.*moralnymi, kulturowymi i religijnymi/);
  assert.match(protectedText('p154'), /brak zatrudnienia nie ograniczał uczestnictwa/);
  assert.match(protectedText('p165'), /mężczyzny i kobiety/);
  assert.match(protectedText('p192'), /sensie najściślejszym/);
  assert.match(protectedText('p197'), /ostatecznością.*uprawnionej obrony/);
  assert.match(protectedText('p198'), /śmiercionośnych.*nieodwracalnych.*wartości i roztropnego osądu.*ekosystemu moralnego.*sumienia.*właściwe granice/);
  assert.match(protectedText('p199'), /odpowiedzialności.*identyfikowalny i weryfikowalny.*szybkości i skuteczności.*walczącymi i niewalczącymi/);
  assert.match(protectedText('p200'), /rzeczywistą, świadomą i odpowiedzialną kontrolą człowieka/);
});

test('Polish edition differences bind local terminology, typos and substantive notes', () => {
  assert.match(paragraphs.get('p061').text, /więcej \[wł\. plus\]/);
  assert.match(paragraphs.get('p105').text, /accountability.*„zdać sprawę”/);
  assert.match(paragraphs.get('p107').text, /„dostosowania” \(alignment\)/);
  assert.match(paragraphs.get('p164').text, /inkulzywność i dostęp/);
  assert.match(paragraphs.get('p169').text, /pracą, usługami i odpoczynkiem/);
  assert.match(paragraphs.get('p234').text, /1 Kor 12, 27/);
  assert.match(corpus.footnotes[27].text, /w tłum\. pol\. n\. 163/);
  assert.match(corpus.footnotes[67].text, /w tłum\. pol\. n\. 9/);
  assert.match(corpus.footnotes[173].text, /Naciski polityczne.*ekonomiczne.*relatywizowania/);
  assert.match(corpus.footnotes[174].text, /1866.*nie potępiając go w pełni/);
  assert.match(corpus.footnotes[181].text, /ataki «prewencyjne»/);
  assert.match(corpus.footnotes[212].text, /25 grudnia 2005.*AAS 98 \(2006\)/);
  for (const id of ['n028', 'n033', 'n068', 'n143', 'n163', 'n175', 'n182', 'n213', 'n217', 'n219']) assert.ok(review.editionDifferences.some(r => r.noteId === id));
});
